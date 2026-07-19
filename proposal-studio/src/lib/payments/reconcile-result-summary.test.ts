import test from "node:test";
import assert from "node:assert/strict";

import { buildReconcileResultSummary } from "./reconcile-result-summary.ts";

test("buildReconcileResultSummary: prioriza el error del servidor sobre cualquier otro campo", () => {
  const summary = buildReconcileResultSummary({ error: "boom", matched: true, applied: true });
  assert.equal(summary.tone, "error");
  assert.equal(summary.description, "boom");
});

test("buildReconcileResultSummary: describe un unmatched conocido con copy específico", () => {
  const summary = buildReconcileResultSummary({ matched: false, reason: "multiple_attempts_conflict" });
  assert.equal(summary.tone, "warning");
  assert.match(summary.description, /conflicto/);
});

test("buildReconcileResultSummary: cae a un mensaje genérico ante un reason desconocido", () => {
  const summary = buildReconcileResultSummary({ matched: false, reason: "algo_nuevo" });
  assert.equal(summary.tone, "warning");
  assert.match(summary.description, /No se pudo correlacionar/);
});

test("buildReconcileResultSummary: marca éxito cuando matched=true y applied=true, mostrando el status final", () => {
  const summary = buildReconcileResultSummary({ matched: true, applied: true, status: "active" });
  assert.equal(summary.tone, "success");
  assert.match(summary.description, /"active"/);
});

test("buildReconcileResultSummary: describe un skipReason conocido cuando matched=true pero applied=false", () => {
  const summary = buildReconcileResultSummary({ matched: true, applied: false, skipReason: "already_current" });
  assert.equal(summary.tone, "warning");
  assert.match(summary.description, /ya estaba en el estado/);
});

test("buildReconcileResultSummary: cae a un mensaje genérico si no hay ningún campo interpretable", () => {
  const summary = buildReconcileResultSummary({});
  assert.equal(summary.tone, "warning");
  assert.equal(summary.title, "Sin resultado");
});
