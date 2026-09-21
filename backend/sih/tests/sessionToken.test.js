import { describe, it, expect } from "vitest";
import { generateSessionToken, hashSessionToken, verifySessionToken } from "../services/sessionToken.js";

describe("sessionToken", () => {
  it("generates a sufficiently random, non-empty token", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("hashing is deterministic for the same input", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("verifySessionToken accepts the correct token against its own hash", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(verifySessionToken(token, hash)).toBe(true);
  });

  it("verifySessionToken rejects a token that does not match the hash (cross-session isolation)", () => {
    const tokenA = generateSessionToken();
    const tokenB = generateSessionToken();
    const hashA = hashSessionToken(tokenA);
    expect(verifySessionToken(tokenB, hashA)).toBe(false);
  });

  it("verifySessionToken rejects empty/missing input safely", () => {
    expect(verifySessionToken("", "somehash")).toBe(false);
    expect(verifySessionToken("token", "")).toBe(false);
    expect(verifySessionToken(null, null)).toBe(false);
  });

  it("never stores or reveals the raw token from the hash (one-way)", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).not.toContain(token);
  });
});
