import { test } from "node:test";
import assert from "node:assert/strict";

import { buildAlternativeFromLibraryContent, buildBenefitFromLibraryContent } from "./build-from-content.ts";
import type { LibraryAlternativeContent, LibraryBenefitContent } from "@/types/library";

test("buildAlternativeFromLibraryContent creates an independent copy of advantages/disadvantages", () => {
  const original: LibraryAlternativeContent = {
    category: "protection",
    description: "desc",
    insurance_company: "ACME",
    product_name: "Vida Plus",
    currency: "ARS",
    monthly_premium: 1000,
    advantages: ["a1"],
    disadvantages: ["d1"],
    notes: "",
  };

  const inserted = buildAlternativeFromLibraryContent("new-id", "Título", original, 0);
  inserted.details.advantages.push("a2");
  inserted.details.disadvantages.push("d2");

  assert.deepEqual(original.advantages, ["a1"]);
  assert.deepEqual(original.disadvantages, ["d1"]);
  assert.deepEqual(inserted.details.advantages, ["a1", "a2"]);
});

test("buildAlternativeFromLibraryContent sets revision 1 and the provided id/display_order", () => {
  const content: LibraryAlternativeContent = {
    category: "savings",
    description: "",
    insurance_company: "ACME",
    product_name: "Ahorro",
    currency: "USD",
    monthly_premium: null,
    advantages: [],
    disadvantages: [],
    notes: "",
  };
  const inserted = buildAlternativeFromLibraryContent("id-1", "T", content, 3);
  assert.equal(inserted.id, "id-1");
  assert.equal(inserted.display_order, 3);
  assert.equal(inserted.revision, 1);
});

test("buildBenefitFromLibraryContent maps content fields 1:1", () => {
  const content: LibraryBenefitContent = { description: "d", icon: "shield", category: "family" };
  const inserted = buildBenefitFromLibraryContent("id-2", "Beneficio", content, 1);
  assert.deepEqual(inserted, {
    client_key: "id-2",
    id: "id-2",
    title: "Beneficio",
    description: "d",
    icon: "shield",
    category: "family",
    display_order: 1,
    revision: 1,
  });
});
