import { test } from "node:test";
import assert from "node:assert/strict";

import { buildAuditDiff } from "./audit-diff.ts";

test("buildAuditDiff detects an added key", () => {
  const diff = buildAuditDiff({ status: "pending" }, { status: "pending", note: "x" });
  assert.deepEqual(diff, [{ key: "note", kind: "added", after: "x" }]);
});

test("buildAuditDiff detects a removed key", () => {
  const diff = buildAuditDiff({ status: "pending", note: "x" }, { status: "pending" });
  assert.deepEqual(diff, [{ key: "note", kind: "removed", before: "x" }]);
});

test("buildAuditDiff detects a modified key", () => {
  const diff = buildAuditDiff({ status: "pending" }, { status: "active" });
  assert.deepEqual(diff, [{ key: "status", kind: "modified", before: "pending", after: "active" }]);
});

test("buildAuditDiff returns no entries for identical objects", () => {
  const diff = buildAuditDiff({ status: "active" }, { status: "active" });
  assert.deepEqual(diff, []);
});

test("buildAuditDiff handles null/non-object inputs as empty objects", () => {
  assert.deepEqual(buildAuditDiff(null, { status: "active" }), [{ key: "status", kind: "added", after: "active" }]);
  assert.deepEqual(buildAuditDiff({ status: "active" }, null), [{ key: "status", kind: "removed", before: "active" }]);
  assert.deepEqual(buildAuditDiff(null, null), []);
});

test("buildAuditDiff sorts entries by key", () => {
  const diff = buildAuditDiff({ zeta: 1 }, { alpha: 1, zeta: 2 });
  assert.deepEqual(diff.map((d) => d.key), ["alpha", "zeta"]);
});
