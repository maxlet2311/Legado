import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeForDisplay, isSensitiveKey } from "./sanitize.ts";

test("sanitizeForDisplay redacts a top-level sensitive key", () => {
  const result = sanitizeForDisplay({ password: "hunter2", email: "a@b.com" });
  assert.deepEqual(result, { password: "[REDACTADO]", email: "a@b.com" });
});

test("sanitizeForDisplay redacts nested objects recursively", () => {
  const result = sanitizeForDisplay({
    user: { name: "Ana", token: "abc123", nested: { access_token: "xyz" } },
  });
  assert.deepEqual(result, {
    user: { name: "Ana", token: "[REDACTADO]", nested: { access_token: "[REDACTADO]" } },
  });
});

test("sanitizeForDisplay redacts sensitive keys inside arrays of objects", () => {
  const result = sanitizeForDisplay([{ secret: "s1" }, { refresh_token: "r1", ok: true }]);
  assert.deepEqual(result, [{ secret: "[REDACTADO]" }, { refresh_token: "[REDACTADO]", ok: true }]);
});

test("sanitizeForDisplay is case-insensitive and ignores separators", () => {
  const result = sanitizeForDisplay({ ApiKey: "k1", "SERVICE-ROLE": "sr", Authorization: "Bearer x" });
  assert.deepEqual(result, {
    ApiKey: "[REDACTADO]",
    "SERVICE-ROLE": "[REDACTADO]",
    Authorization: "[REDACTADO]",
  });
});

test("sanitizeForDisplay never mutates the original value", () => {
  const original = { password: "hunter2" };
  sanitizeForDisplay(original);
  assert.equal(original.password, "hunter2");
});

test("sanitizeForDisplay passes through primitives and null unchanged", () => {
  assert.equal(sanitizeForDisplay("hello"), "hello");
  assert.equal(sanitizeForDisplay(42), 42);
  assert.equal(sanitizeForDisplay(null), null);
});

test("isSensitiveKey matches known fragments regardless of casing/separators", () => {
  assert.equal(isSensitiveKey("jwt"), true);
  assert.equal(isSensitiveKey("x-api-key"), true);
  assert.equal(isSensitiveKey("cookie"), true);
  assert.equal(isSensitiveKey("email"), false);
  assert.equal(isSensitiveKey("status"), false);
});
