import test from "node:test";
import assert from "node:assert/strict";
import { hmacHex, hmacSignBase64Url, hmacVerifyBase64Url, sha256Hex, timingSafeEqualHex } from "../api/_lib/crypto.js";

test("sha256Hex is deterministic and hex-encoded", async () => {
  const digest = await sha256Hex("hello");
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(digest, await sha256Hex("hello"));
});

test("timingSafeEqualHex compares equal/unequal strings correctly", () => {
  assert.equal(timingSafeEqualHex("abc123", "abc123"), true);
  assert.equal(timingSafeEqualHex("abc123", "abc124"), false);
  assert.equal(timingSafeEqualHex("abc", "abcd"), false);
});

test("hmacHex produces a verifiable hex digest used by the webhook signer", async () => {
  const digest = await hmacHex("secret", "message");
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(digest, await hmacHex("secret", "message"));
  assert.notEqual(digest, await hmacHex("other-secret", "message"));
});

test("hmacSignBase64Url / hmacVerifyBase64Url round-trip used by session tokens", async () => {
  const signature = await hmacSignBase64Url("session-id", "secret");
  assert.equal(await hmacVerifyBase64Url("session-id", signature, "secret"), true);
  assert.equal(await hmacVerifyBase64Url("session-id", signature, "wrong-secret"), false);
  assert.equal(await hmacVerifyBase64Url("tampered-id", signature, "secret"), false);
});
