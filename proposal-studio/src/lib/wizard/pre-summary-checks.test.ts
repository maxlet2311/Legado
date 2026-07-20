import { test } from "node:test";
import assert from "node:assert/strict";

import { runDeterministicChecks } from "./pre-summary-checks.ts";
import type { WizardData } from "@/types/wizard";

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
      current_situation: "x",
      detected_needs: "",
      objectives: "",
      detected_risks: "",
      opportunities: "",
      recommended_strategy: "Recomendación completa",
      updated_at: null,
      revision: null,
    },
    alternatives: [],
    benefits: [],
    comparison: { columns: [], rows: [], updated_at: null, revision: null },
    ...overrides,
  };
}

test("flags an alternative without a title as a blocking error", () => {
  const data = baseData({
    alternatives: [
      {
        client_key: "test-alt-1",
        id: null,
        title: "",
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
  });
  const findings = runDeterministicChecks(data);
  assert.ok(findings.some((f) => f.severity === "error" && f.message.includes("sin título")));
});

test("flags an alternative missing commercial data (company/product)", () => {
  const data = baseData({
    alternatives: [
      {
        client_key: "test-alt-2",
        id: null,
        title: "Alt",
        description: "",
        category: "protection",
        insurance_company: "",
        product_name: "",
        currency: "ARS",
        monthly_premium: null,
        details: { advantages: [], disadvantages: [], notes: "" },
        display_order: 0,
        revision: null,
      },
    ],
  });
  const findings = runDeterministicChecks(data);
  assert.ok(findings.some((f) => f.severity === "error" && f.message.includes("compañía/producto")));
});

test("flags an empty recommendation as a blocking error", () => {
  const data = baseData({
    narrative: {
      current_situation: "x",
      detected_needs: "",
      objectives: "",
      detected_risks: "",
      opportunities: "",
      recommended_strategy: "",
      updated_at: null,
      revision: null,
    },
  });
  const findings = runDeterministicChecks(data);
  assert.ok(findings.some((f) => f.severity === "error" && f.message.includes("recomendación está vacía")));
});

test("flags inconsistent comparison (columns without rows) as a warning, not an error", () => {
  const data = baseData({ comparison: { columns: [{ id: "c1", label: "Col" }], rows: [], updated_at: null, revision: null } });
  const findings = runDeterministicChecks(data);
  const finding = findings.find((f) => f.message.includes("comparativa"));
  assert.ok(finding);
  assert.equal(finding?.severity, "warning");
});

test("returns no findings for a complete, consistent proposal", () => {
  const data = baseData();
  const findings = runDeterministicChecks(data);
  assert.deepEqual(findings, []);
});
