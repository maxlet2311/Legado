import test from "node:test";
import assert from "node:assert/strict";

import { resolveTargetStatus } from "./target-status.ts";

test("resolveTargetStatus: pago aprobado desde authorized -> active", () => {
  assert.equal(resolveTargetStatus("authorized", "authorized", { approved: true, paidAt: null }), "active");
});

test("resolveTargetStatus: pago aprobado desde past_due -> active (regularización)", () => {
  assert.equal(resolveTargetStatus("past_due", "authorized", { approved: true, paidAt: null }), "active");
});

test("resolveTargetStatus: pago aprobado repetido estando ya active -> active (idempotente para el caller)", () => {
  assert.equal(resolveTargetStatus("active", "authorized", { approved: true, paidAt: null }), "active");
});

test("resolveTargetStatus: pago aprobado sin estado aplicable (pending) -> null", () => {
  assert.equal(resolveTargetStatus("pending", "pending", { approved: true, paidAt: null }), null);
});

test("resolveTargetStatus: pago rechazado desde active -> past_due", () => {
  assert.equal(resolveTargetStatus("active", "authorized", { approved: false, paidAt: null }), "past_due");
});

test("resolveTargetStatus: pago rechazado sin estar active -> null (no aplica)", () => {
  assert.equal(resolveTargetStatus("authorized", "authorized", { approved: false, paidAt: null }), null);
});

test("resolveTargetStatus: evento de preapproval mapea 1 a 1 (pending/authorized/paused/canceled)", () => {
  assert.equal(resolveTargetStatus("pending", "authorized", null), "authorized");
  assert.equal(resolveTargetStatus("active", "paused", null), "paused");
  assert.equal(resolveTargetStatus("authorized", "canceled", null), "canceled");
  assert.equal(resolveTargetStatus("pending", "pending", null), "pending");
});

test("resolveTargetStatus: estado no reconocido (unknown) -> null, nunca se inventa una transición", () => {
  assert.equal(resolveTargetStatus("active", "unknown", null), null);
});
