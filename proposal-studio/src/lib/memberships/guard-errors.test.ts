import test from "node:test";
import assert from "node:assert/strict";

import {
  MembershipGuardError,
  MembershipRequiredError,
  MembershipPastDueError,
  MembershipSuspendedError,
  MembershipDataInconsistentError,
  MembershipServiceUnavailableError,
} from "./guard-errors.ts";

test("cada error tipado es instancia de MembershipGuardError y tiene un code estable", () => {
  const errors: MembershipGuardError[] = [
    new MembershipRequiredError("no_membership"),
    new MembershipPastDueError(),
    new MembershipSuspendedError(),
    new MembershipDataInconsistentError(),
    new MembershipServiceUnavailableError(),
  ];

  for (const error of errors) {
    assert.ok(error instanceof MembershipGuardError);
    assert.equal(typeof error.code, "string");
    assert.ok(error.code.length > 0);
  }
});

test("MembershipRequiredError conserva la razón real recibida", () => {
  const error = new MembershipRequiredError("period_expired");
  assert.equal(error.reason, "period_expired");
});

test("MembershipServiceUnavailableError conserva la causa original sin exponerla en message", () => {
  const cause = new Error("detalle interno de Supabase");
  const error = new MembershipServiceUnavailableError(cause);
  assert.equal(error.cause, cause);
  assert.ok(!error.message.includes("detalle interno de Supabase"));
});

test("códigos distintos por tipo de error (no colisionan)", () => {
  const codes = new Set(
    [
      new MembershipRequiredError("no_membership"),
      new MembershipPastDueError(),
      new MembershipSuspendedError(),
      new MembershipDataInconsistentError(),
      new MembershipServiceUnavailableError(),
    ].map((e) => e.code),
  );
  assert.equal(codes.size, 5);
});
