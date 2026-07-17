import test from "node:test";
import assert from "node:assert/strict";

import { evaluateMembershipAccess, canTransitionMembershipStatus } from "./access.ts";
import type { MembershipAccessInput } from "./types.ts";

const NOW = new Date("2026-07-16T00:00:00.000Z");
const FUTURE = "2026-08-16T00:00:00.000Z";
const PAST = "2026-06-16T00:00:00.000Z";

function membership(overrides: Partial<MembershipAccessInput>): MembershipAccessInput {
  return { status: "active", ...overrides };
}

test("evaluateMembershipAccess: sin membresía -> blocked/no_membership", () => {
  const result = evaluateMembershipAccess(null, NOW);
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "no_membership" });
});

test("evaluateMembershipAccess: active vigente -> full", () => {
  const result = evaluateMembershipAccess(membership({ status: "active", currentPeriodEnd: FUTURE }), NOW);
  assert.deepEqual(result, { allowed: true, level: "full", reason: "active" });
});

test("evaluateMembershipAccess: active vencida -> blocked/period_expired", () => {
  const result = evaluateMembershipAccess(membership({ status: "active", currentPeriodEnd: PAST }), NOW);
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "period_expired" });
});

test("evaluateMembershipAccess: authorized vigente -> full", () => {
  const result = evaluateMembershipAccess(membership({ status: "authorized", currentPeriodEnd: FUTURE }), NOW);
  assert.deepEqual(result, { allowed: true, level: "full", reason: "authorized" });
});

test("evaluateMembershipAccess: authorized sin fecha de fin -> full (autorización manual sin período todavía)", () => {
  const result = evaluateMembershipAccess(membership({ status: "authorized", currentPeriodEnd: null }), NOW);
  assert.deepEqual(result, { allowed: true, level: "full", reason: "authorized" });
});

test("evaluateMembershipAccess: pending -> blocked/not_started", () => {
  const result = evaluateMembershipAccess(membership({ status: "pending" }), NOW);
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "not_started" });
});

test("evaluateMembershipAccess: past_due con gracia vigente -> grace", () => {
  const result = evaluateMembershipAccess(
    membership({ status: "past_due", currentPeriodEnd: PAST, gracePeriodEnd: FUTURE }),
    NOW,
  );
  assert.deepEqual(result, { allowed: true, level: "grace", reason: "grace_period" });
});

test("evaluateMembershipAccess: past_due con gracia vencida -> blocked/period_expired", () => {
  const result = evaluateMembershipAccess(
    membership({ status: "past_due", currentPeriodEnd: PAST, gracePeriodEnd: PAST }),
    NOW,
  );
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "period_expired" });
});

test("evaluateMembershipAccess: past_due sin grace_period_end -> blocked/payment_required", () => {
  const result = evaluateMembershipAccess(membership({ status: "past_due", currentPeriodEnd: PAST }), NOW);
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "payment_required" });
});

test("evaluateMembershipAccess: grace_period vigente -> grace", () => {
  const result = evaluateMembershipAccess(membership({ status: "grace_period", gracePeriodEnd: FUTURE }), NOW);
  assert.deepEqual(result, { allowed: true, level: "grace", reason: "grace_period" });
});

test("evaluateMembershipAccess: suspended -> blocked", () => {
  const result = evaluateMembershipAccess(membership({ status: "suspended" }), NOW);
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "suspended" });
});

test("evaluateMembershipAccess: canceled -> blocked", () => {
  const result = evaluateMembershipAccess(membership({ status: "canceled" }), NOW);
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "canceled" });
});

test("evaluateMembershipAccess: paused -> blocked", () => {
  const result = evaluateMembershipAccess(membership({ status: "paused" }), NOW);
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "paused" });
});

test("evaluateMembershipAccess: expired -> blocked", () => {
  const result = evaluateMembershipAccess(membership({ status: "expired" }), NOW);
  assert.deepEqual(result, { allowed: false, level: "blocked", reason: "expired" });
});

test("evaluateMembershipAccess: fecha inconsistente (no numérica) -> blocked", () => {
  const result = evaluateMembershipAccess(
    membership({ status: "active", currentPeriodEnd: "no-es-una-fecha" }),
    NOW,
  );
  assert.equal(result.allowed, false);
  assert.equal(result.level, "blocked");
});

test("canTransitionMembershipStatus: transiciones válidas", () => {
  assert.equal(canTransitionMembershipStatus("pending", "authorized"), true);
  assert.equal(canTransitionMembershipStatus("authorized", "active"), true);
  assert.equal(canTransitionMembershipStatus("active", "past_due"), true);
  assert.equal(canTransitionMembershipStatus("past_due", "grace_period"), true);
  assert.equal(canTransitionMembershipStatus("grace_period", "active"), true);
});

test("canTransitionMembershipStatus: transiciones inválidas bloqueadas", () => {
  assert.equal(canTransitionMembershipStatus("pending", "active"), false);
  assert.equal(canTransitionMembershipStatus("canceled", "active"), false);
  assert.equal(canTransitionMembershipStatus("expired", "active"), false);
  assert.equal(canTransitionMembershipStatus("active", "pending"), false);
});
