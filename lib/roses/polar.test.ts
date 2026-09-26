import { createHmac, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyPolarWebhook } from "./polar";

function testSecret(): string {
  return `whsec_${randomBytes(24).toString("base64")}`;
}

function sign(secret: string, id: string, timestamp: string, payload: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64");
}

describe("verifyPolarWebhook (Standard Webhooks)", () => {
  it("accepts a correctly signed payload", () => {
    const secret = testSecret();
    const id = "wh_123";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify({ id, type: "order.paid" });
    const signature = `v1,${sign(secret, id, timestamp, payload)}`;

    expect(verifyPolarWebhook(payload, { id, timestamp, signature }, secret)).toBe(true);
  });

  it("accepts when the good signature is one of several space-separated candidates", () => {
    const secret = testSecret();
    const id = "wh_123";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = "{}";
    const good = sign(secret, id, timestamp, payload);
    const signature = `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= v1,${good}`;

    expect(verifyPolarWebhook(payload, { id, timestamp, signature }, secret)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const secret = testSecret();
    const id = "wh_123";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `v1,${sign(secret, id, timestamp, "{}")}`;

    expect(verifyPolarWebhook('{"evil":true}', { id, timestamp, signature }, secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const secret = testSecret();
    const id = "wh_123";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = "{}";
    const signature = `v1,${sign(secret, id, timestamp, payload)}`;

    expect(verifyPolarWebhook(payload, { id, timestamp, signature }, testSecret())).toBe(false);
  });

  it("rejects missing headers", () => {
    const secret = testSecret();
    expect(verifyPolarWebhook("{}", { id: "", timestamp: "1", signature: "v1,x" }, secret)).toBe(false);
    expect(verifyPolarWebhook("{}", { id: "a", timestamp: null, signature: "v1,x" }, secret)).toBe(false);
    expect(verifyPolarWebhook("{}", { id: "a", timestamp: "1", signature: null }, secret)).toBe(false);
  });

  it("rejects stale timestamps (replay protection)", () => {
    const secret = testSecret();
    const id = "wh_123";
    const timestamp = "1"; // 1970 — way outside the tolerance window
    const payload = "{}";
    const signature = `v1,${sign(secret, id, timestamp, payload)}`;

    expect(verifyPolarWebhook(payload, { id, timestamp, signature }, secret)).toBe(false);
  });
});
