import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the roses service layer and the service-role client — no real DB.
vi.mock("./balance", () => ({ spendRoses: vi.fn() }));
vi.mock("../supabase/service-role", () => ({ createServiceRoleClient: vi.fn() }));

import { spendRoses } from "./balance";
import { createServiceRoleClient } from "../supabase/service-role";
import { ensureMonthlyGrant, monthStart, withRoses } from "./gate";

const mockedSpendRoses = vi.mocked(spendRoses);
const mockedCreateServiceRoleClient = vi.mocked(createServiceRoleClient);

function mockGrantRpc(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { rpc, client: { rpc } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("monthStart", () => {
  it("returns the first day of the month as YYYY-MM-DD", () => {
    expect(monthStart(new Date("2026-09-26T14:30:00Z"))).toBe("2026-09-01");
  });

  it("handles January", () => {
    expect(monthStart(new Date("2026-01-15T00:00:00Z"))).toBe("2026-01-01");
  });

  it("uses UTC so late-night local times stay in the right month", () => {
    // 2026-10-01 00:30 at UTC+2 is still 2026-09-30 in UTC.
    expect(monthStart(new Date("2026-10-01T00:30:00+02:00"))).toBe("2026-09-01");
  });
});

describe("ensureMonthlyGrant", () => {
  it("calls the ensure_monthly_grant RPC and returns the balance", async () => {
    const { rpc, client } = mockGrantRpc(30);
    mockedCreateServiceRoleClient.mockReturnValue(client as never);

    const balance = await ensureMonthlyGrant("user-1");

    expect(rpc).toHaveBeenCalledWith("ensure_monthly_grant", { p_user_id: "user-1" });
    expect(balance).toBe(30);
  });

  it("throws a clear error when the RPC fails", async () => {
    const { client } = mockGrantRpc(null, { message: "boom" });
    mockedCreateServiceRoleClient.mockReturnValue(client as never);

    await expect(ensureMonthlyGrant("user-1")).rejects.toThrow(/roses\.ensureMonthlyGrant/);
  });
});

describe("withRoses", () => {
  it("runs monthly grant, then spend, then fn — in that order", async () => {
    const order: string[] = [];
    const { rpc, client } = mockGrantRpc(30);
    mockedCreateServiceRoleClient.mockReturnValue(client as never);
    mockedSpendRoses.mockImplementation(async () => {
      order.push("spend");
      return 25;
    });
    rpc.mockImplementation(async () => {
      order.push("grant");
      return { data: 30, error: null };
    });

    const { result, balance } = await withRoses("user-1", 5, "generation", async () => {
      order.push("fn");
      return "done";
    });

    expect(order).toEqual(["grant", "spend", "fn"]);
    expect(mockedSpendRoses).toHaveBeenCalledWith("user-1", 5, "generation");
    expect(result).toBe("done");
    expect(balance).toBe(25);
  });

  it("propagates InsufficientRosesError without running fn", async () => {
    const { client } = mockGrantRpc(3);
    mockedCreateServiceRoleClient.mockReturnValue(client as never);
    const boom = new Error("insufficient_roses");
    boom.name = "InsufficientRosesError";
    mockedSpendRoses.mockRejectedValue(boom);
    const fn = vi.fn();

    await expect(withRoses("user-1", 10, "generation", fn)).rejects.toBe(boom);
    expect(fn).not.toHaveBeenCalled();
  });

  it("lets the spend stand when fn throws (generation failures are the caller's problem)", async () => {
    const { client } = mockGrantRpc(30);
    mockedCreateServiceRoleClient.mockReturnValue(client as never);
    mockedSpendRoses.mockResolvedValue(25);

    await expect(
      withRoses("user-1", 5, "generation", async () => {
        throw new Error("model exploded");
      }),
    ).rejects.toThrow("model exploded");

    // The spend happened exactly once — no automatic refund.
    expect(mockedSpendRoses).toHaveBeenCalledTimes(1);
  });
});
