import test from "node:test";
import assert from "node:assert/strict";

import { resolveAttemptMatch } from "./attempt-match.ts";

test("resolveAttemptMatch: cero coincidencias -> unmatched (nunca fallback)", () => {
  const result = resolveAttemptMatch([]);
  assert.equal(result.outcome, "unmatched");
});

test("resolveAttemptMatch: una coincidencia exacta -> matched", () => {
  const result = resolveAttemptMatch([{ id: "attempt-1" }]);
  assert.deepEqual(result, { outcome: "matched", attempt: { id: "attempt-1" } });
});

test("resolveAttemptMatch: más de una coincidencia -> conflict, nunca elige ninguna", () => {
  const result = resolveAttemptMatch([{ id: "a" }, { id: "b" }]);
  assert.equal(result.outcome, "conflict");
  if (result.outcome === "conflict") {
    assert.equal(result.attempts.length, 2);
  }
});
