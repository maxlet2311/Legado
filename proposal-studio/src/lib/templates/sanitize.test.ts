import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeProposalForTemplate, fieldsRequiringReview } from "./sanitize.ts";
import type { RawProposalBundle } from "./sanitize.ts";

const bundle: RawProposalBundle = {
  proposal_type: "individual",
  primary_objective: "protect_family",
  product: "Vida",
  currency: "ARS",
  narrative: {
    current_situation: "Situación real del cliente Juan Pérez",
    detected_needs: "",
    objectives: "",
    detected_risks: "",
    opportunities: "",
    recommended_strategy: "Estrategia",
  },
  alternatives: [
    {
      title: "Alt 1",
      description: "d",
      category: "protection",
      insurance_company: "ACME",
      product_name: "Vida Plus",
      currency: "ARS",
      monthly_premium: 15000,
      financial_details: { advantages: ["a"], disadvantages: [], notes: "" },
      display_order: 0,
    },
  ],
  benefits: [],
  comparison: null,
};

test("sanitizeProposalForTemplate nulls monthly_premium by default", () => {
  const result = sanitizeProposalForTemplate(bundle, false);
  assert.equal(result.alternatives[0]?.monthly_premium, null);
  assert.equal(result.is_example_values, false);
});

test("sanitizeProposalForTemplate keeps amounts only when explicitly flagged as example values", () => {
  const result = sanitizeProposalForTemplate(bundle, true);
  assert.equal(result.alternatives[0]?.monthly_premium, 15000);
  assert.equal(result.is_example_values, true);
});

test("sanitizeProposalForTemplate never includes a client_id field", () => {
  const result = sanitizeProposalForTemplate(bundle, false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "client_id"), false);
});

test("fieldsRequiringReview flags nulled amounts and empty diagnosis", () => {
  const sanitized = sanitizeProposalForTemplate(bundle, false);
  const fields = fieldsRequiringReview(sanitized);
  assert.ok(fields.includes("monthly_premium"));
});

test("fieldsRequiringReview does not flag amounts kept as example values", () => {
  const sanitized = sanitizeProposalForTemplate(bundle, true);
  const fields = fieldsRequiringReview(sanitized);
  assert.equal(fields.includes("monthly_premium"), false);
});
