import { test } from "node:test";
import assert from "node:assert/strict";

import { clampRequestedStep, computeMaxReachableStep } from "./step-completion.ts";
import type { WizardData } from "@/types/wizard";

const STEP_COUNT = 8;

function baseData(overrides: Partial<WizardData> = {}): WizardData {
  return {
    proposalId: "p1",
    advisorName: "Asesor",
    client: { id: "c1", full_name: "Cliente", company_name: null, client_type: "individual", email: "a@b.com", phone: null },
    meta: {
      id: "p1",
      proposal_number: "1",
      client_id: "c1",
      title: "T",
      proposal_type: "individual",
      primary_objective: "custom",
      product: "Vida",
      currency: "ARS",
      internal_notes: "",
      status: "draft",
      created_at: "",
      updated_at: "",
      revision: 1,
      duplication_reviewed: true,
    },
    narrative: {
      current_situation: "",
      detected_needs: "",
      objectives: "",
      detected_risks: "",
      opportunities: "",
      recommended_strategy: "",
      executive_summary: "",
      final_message: "",
      updated_at: null,
      revision: null,
    },
    alternatives: [],
    benefits: [],
    comparison: { columns: [], rows: [], updated_at: null, revision: null },
    ...overrides,
  };
}

test("computeMaxReachableStep returns first incomplete index", () => {
  assert.equal(computeMaxReachableStep([true, true, false, false]), 2);
});

test("computeMaxReachableStep returns last index when everything is complete", () => {
  assert.equal(computeMaxReachableStep([true, true, true]), 2);
});

test("clampRequestedStep keeps a reachable requested step (reload preserves step)", () => {
  const data = baseData({
    narrative: { ...baseData().narrative, current_situation: "diagnóstico completo" },
  });
  // step 2 (Diagnóstico) is reachable/complete; step 3 (Alternativas) is the next one.
  assert.equal(clampRequestedStep(2, data, STEP_COUNT), 2);
});

test("clampRequestedStep does not trap the user on an unreachable step: clamps down to the first incomplete step", () => {
  // baseData() has client + título/producto (steps 0-1) but nothing else: first
  // incomplete step is 2 (Diagnóstico); a stale/manual ?step=6 must not trap
  // the user past data they haven't created yet.
  const data = baseData();
  assert.equal(clampRequestedStep(6, data, STEP_COUNT), 2);
});

test("clampRequestedStep clamps negative or non-integer input to 0", () => {
  const data = baseData();
  assert.equal(clampRequestedStep(-5, data, STEP_COUNT), 0);
  assert.equal(clampRequestedStep(Number.NaN, data, STEP_COUNT), 0);
});

test("clampRequestedStep never exceeds stepCount - 1", () => {
  const data = baseData({
    client: { ...baseData().client, id: "c1" },
    meta: { ...baseData().meta, title: "T", product: "Vida", status: "completed" },
    narrative: {
      ...baseData().narrative,
      current_situation: "x",
      recommended_strategy: "y",
    },
    alternatives: [
      {
        client_key: "a1",
        id: "a1",
        title: "Alt",
        description: "",
        category: "protection",
        insurance_company: "ACME",
        product_name: "Vida",
        currency: "ARS",
        monthly_premium: null,
        details: { advantages: [], disadvantages: [], notes: "" },
        display_order: 0,
        revision: null,
      },
    ],
    benefits: [
      {
        client_key: "b1",
        id: "b1",
        title: "B",
        description: "",
        icon: "star",
        category: "family",
        display_order: 0,
        revision: null,
      },
    ],
    comparison: {
      columns: [{ id: "c1", label: "Col" }],
      rows: [{ id: "r1", label: "Row", values: {} }],
      updated_at: null,
      revision: null,
    },
  });
  assert.equal(clampRequestedStep(999, data, STEP_COUNT), STEP_COUNT - 1);
});
