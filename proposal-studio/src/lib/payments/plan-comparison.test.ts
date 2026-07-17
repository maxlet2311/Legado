import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCreateSubscriptionPlanInput,
  buildExclusiveCheckoutPlanInput,
  buildAttemptReasonRef,
  compareProviderPlan,
  maskProviderPlanId,
} from "./plan-comparison.ts";

const localMonthlyPlan = {
  name: "Membresía de prueba",
  price: 100,
  currency: "ARS",
  billingInterval: "month" as const,
  billingIntervalCount: 1,
};

test("buildCreateSubscriptionPlanInput: toma monto, moneda y frecuencia exclusivamente del plan local", () => {
  const input = buildCreateSubscriptionPlanInput(localMonthlyPlan, "https://example.com/admin/membership-plans");
  assert.deepEqual(input, {
    reason: "Membresía de prueba",
    amount: 100,
    currency: "ARS",
    frequency: 1,
    frequencyType: "months",
    backUrl: "https://example.com/admin/membership-plans",
  });
});

test("buildCreateSubscriptionPlanInput: plan anual se representa como 12 meses", () => {
  const input = buildCreateSubscriptionPlanInput(
    { ...localMonthlyPlan, billingInterval: "year", billingIntervalCount: 1 },
    "https://example.com",
  );
  assert.equal(input.frequency, 12);
  assert.equal(input.frequencyType, "months");
});

test("compareProviderPlan: coincide en monto, moneda y frecuencia -> matches true", () => {
  const result = compareProviderPlan(localMonthlyPlan, {
    providerPlanId: "plan-id",
    reason: "Membresía de prueba",
    amount: 100,
    currency: "ARS",
    frequency: 1,
    frequencyType: "months",
    status: "active",
    initPoint: "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=plan-id",
  });
  assert.equal(result.matches, true);
  assert.deepEqual(result.mismatches, []);
});

test("compareProviderPlan: monto remoto distinto -> mismatch", () => {
  const result = compareProviderPlan(localMonthlyPlan, {
    providerPlanId: "plan-id",
    reason: "Membresía de prueba",
    amount: 150,
    currency: "ARS",
    frequency: 1,
    frequencyType: "months",
    status: "active",
    initPoint: "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=plan-id",
  });
  assert.equal(result.matches, false);
  assert.match(result.mismatches[0] ?? "", /monto/);
});

test("compareProviderPlan: moneda remota distinta -> mismatch", () => {
  const result = compareProviderPlan(localMonthlyPlan, {
    providerPlanId: "plan-id",
    reason: "Membresía de prueba",
    amount: 100,
    currency: "USD",
    frequency: 1,
    frequencyType: "months",
    status: "active",
    initPoint: "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=plan-id",
  });
  assert.equal(result.matches, false);
  assert.ok(result.mismatches.some((m) => m.includes("moneda")));
});

test("compareProviderPlan: frecuencia remota distinta -> mismatch", () => {
  const result = compareProviderPlan(localMonthlyPlan, {
    providerPlanId: "plan-id",
    reason: "Membresía de prueba",
    amount: 100,
    currency: "ARS",
    frequency: 2,
    frequencyType: "months",
    status: "active",
    initPoint: "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=plan-id",
  });
  assert.equal(result.matches, false);
  assert.ok(result.mismatches.some((m) => m.includes("frecuencia")));
});

test("compareProviderPlan: redondeo de centavos no genera falso mismatch", () => {
  const result = compareProviderPlan(
    { ...localMonthlyPlan, price: 100.0 },
    {
      providerPlanId: "plan-id",
      reason: "Membresía de prueba",
      amount: 100.0,
      currency: "ARS",
      frequency: 1,
      frequencyType: "months",
      status: "active",
    initPoint: "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=plan-id",
    },
  );
  assert.equal(result.matches, true);
});

test("maskProviderPlanId: nunca expone el id completo", () => {
  const masked = maskProviderPlanId("2c938084726fca480172703813441234");
  assert.equal(masked.includes("2c938084726fca480172703813441234"), false);
  assert.match(masked, /^2c93\.\.\./);
});

test("maskProviderPlanId: ids muy cortos se enmascaran por completo", () => {
  assert.equal(maskProviderPlanId("abc"), "***");
});

test("buildAttemptReasonRef: nunca incluye guiones ni caracteres del uuid crudo, longitud fija", () => {
  const ref = buildAttemptReasonRef();
  assert.equal(ref.length, 8);
  assert.match(ref, /^[0-9A-F]{8}$/);
});

test("buildAttemptReasonRef: genera valores distintos en llamadas sucesivas", () => {
  const a = buildAttemptReasonRef();
  const b = buildAttemptReasonRef();
  assert.notEqual(a, b);
});

test("buildExclusiveCheckoutPlanInput: reason no incluye email ni uuid — solo nombre del plan y ref corta", () => {
  const input = buildExclusiveCheckoutPlanInput(localMonthlyPlan, "https://example.com/account/membership", "ABCD1234");
  assert.equal(input.reason, "Proposal Studio — Membresía de prueba — Ref ABCD1234");
  assert.doesNotMatch(input.reason, /@/);
  assert.doesNotMatch(input.reason, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});

test("buildExclusiveCheckoutPlanInput: monto/moneda/frecuencia salen exclusivamente del plan local", () => {
  const input = buildExclusiveCheckoutPlanInput(localMonthlyPlan, "https://example.com", "REF00001");
  assert.equal(input.amount, 100);
  assert.equal(input.currency, "ARS");
  assert.equal(input.frequency, 1);
  assert.equal(input.frequencyType, "months");
  assert.equal(input.backUrl, "https://example.com");
});
