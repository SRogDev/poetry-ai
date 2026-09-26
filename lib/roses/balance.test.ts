import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Supabase boundary — never hit a real DB in unit tests.
vi.mock("../supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("../supabase/service-role", () => ({ createServiceRoleClient: vi.fn() }));

import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service-role";
import {
  ROSE_COSTS,
  SIGNUP_BONUS_ROSES,
  InsufficientRosesError,
  getBalance,
  spendRoses,
  grantRoses,
} from "./balance";

const mockedCreateClient = vi.mocked(createClient);
const mockedCreateServiceRoleClient = vi.mocked(createServiceRoleClient);

/** Chainable mock for supabase.from("profiles").select().eq().single() */
function mockProfileSelect(data: unknown, error: { message: string } | null = null) {
  const single = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  return { from: vi.fn().mockReturnValue({ select }), single, eq, select };
}

/** Mock for supabase.rpc(...) */
function mockRpc(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { rpc, client: { rpc } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ROSE_COSTS", () => {
  it("matches BUILD.md — the single source of truth", () => {
    expect(ROSE_COSTS).toEqual({
      poem: 1,
      letter: 2,
      quote: 2,
      slideshow: 5,
      video: 10,
      song: 15,
      lovi_create: 15,
      lovi_use: 5,
    });
  });
});

describe("SIGNUP_BONUS_ROSES", () => {
  it("is 10 (mirrors db.sql handle_new_user)", () => {
    expect(SIGNUP_BONUS_ROSES).toBe(10);
  });
});

describe("getBalance", () => {
  it("reads profiles.roses_balance through the user-scoped client", async () => {
    const q = mockProfileSelect({ roses_balance: 42 });
    mockedCreateClient.mockResolvedValue(q as never);

    const balance = await getBalance("user-1");

    expect(balance).toBe(42);
    expect(q.from).toHaveBeenCalledWith("profiles");
    expect(q.select).toHaveBeenCalledWith("roses_balance");
    expect(q.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("throws a clear error when the read fails", async () => {
    const q = mockProfileSelect(null, { message: "boom" });
    mockedCreateClient.mockResolvedValue(q as never);

    await expect(getBalance("user-1")).rejects.toThrow(/roses\.getBalance/);
  });
});

describe("spendRoses", () => {
  it("calls the spend_roses RPC with a positive amount and returns the new balance", async () => {
    const { rpc, client } = mockRpc(25);
    mockedCreateServiceRoleClient.mockReturnValue(client as never);

    const balance = await spendRoses("user-1", 5, "generation", "ded-1");

    expect(rpc).toHaveBeenCalledWith("spend_roses", {
      p_user_id: "user-1",
      p_amount: 5,
      p_reason: "generation",
      p_ref: "ded-1",
    });
    expect(balance).toBe(25);
  });

  it("sends null ref when none is given", async () => {
    const { rpc, client } = mockRpc(9);
    mockedCreateServiceRoleClient.mockReturnValue(client as never);

    await spendRoses("user-1", 1, "generation");

    expect(rpc).toHaveBeenCalledWith("spend_roses", {
      p_user_id: "user-1",
      p_amount: 1,
      p_reason: "generation",
      p_ref: null,
    });
  });

  it("throws InsufficientRosesError carrying the current balance on insufficient_roses", async () => {
    const { client } = mockRpc(null, { message: "insufficient_roses" });
    const q = mockProfileSelect({ roses_balance: 3 });
    mockedCreateServiceRoleClient.mockReturnValue({ ...client, ...q } as never);

    const err = await spendRoses("user-1", 10, "generation").catch((e) => e);

    expect(err).toBeInstanceOf(InsufficientRosesError);
    expect((err as InsufficientRosesError).balance).toBe(3);
    expect((err as Error).message).toBe("insufficient_roses");
  });

  it("throws InsufficientRosesError with null balance when the balance read fails", async () => {
    const { client } = mockRpc(null, { message: "insufficient_roses" });
    const q = mockProfileSelect(null, { message: "nope" });
    mockedCreateServiceRoleClient.mockReturnValue({ ...client, ...q } as never);

    const err = await spendRoses("user-1", 10, "generation").catch((e) => e);

    expect(err).toBeInstanceOf(InsufficientRosesError);
    expect((err as InsufficientRosesError).balance).toBeNull();
  });

  it("throws a plain error for other RPC failures", async () => {
    const { client } = mockRpc(null, { message: "connection reset" });
    mockedCreateServiceRoleClient.mockReturnValue(client as never);

    await expect(spendRoses("user-1", 1, "generation")).rejects.toThrow(/roses\.spendRoses/);
  });
});

describe("grantRoses", () => {
  it("calls the add_roses RPC with a positive delta and returns the new balance", async () => {
    const { rpc, client } = mockRpc(110);
    mockedCreateServiceRoleClient.mockReturnValue(client as never);

    const balance = await grantRoses("user-1", 100, "subscription", "evt-1");

    expect(rpc).toHaveBeenCalledWith("add_roses", {
      p_user_id: "user-1",
      p_delta: 100,
      p_reason: "subscription",
      p_ref: "evt-1",
    });
    expect(balance).toBe(110);
  });

  it("throws a clear error when the RPC fails", async () => {
    const { client } = mockRpc(null, { message: "boom" });
    mockedCreateServiceRoleClient.mockReturnValue(client as never);

    await expect(grantRoses("user-1", 10, "topup")).rejects.toThrow(/roses\.grantRoses/);
  });
});
