import { test } from "node:test";
import assert from "node:assert/strict";

import { filterOutExistingBenefits } from "./suggest-benefits-filter.ts";

test("filters out a suggestion that exactly matches an existing title", () => {
  const suggestions = [{ title: "Cobertura por fallecimiento", description: "d", icon: "shield" }];
  const result = filterOutExistingBenefits(suggestions, ["Cobertura por fallecimiento"]);
  assert.deepEqual(result, []);
});

test("filter is case-insensitive and trims whitespace", () => {
  const suggestions = [{ title: "  Cobertura Total  ", description: "d", icon: "shield" }];
  const result = filterOutExistingBenefits(suggestions, ["cobertura total"]);
  assert.deepEqual(result, []);
});

test("keeps suggestions that do not match any existing title", () => {
  const suggestions = [{ title: "Beneficio nuevo", description: "d", icon: "star" }];
  const result = filterOutExistingBenefits(suggestions, ["Otro beneficio"]);
  assert.equal(result.length, 1);
});

test("keeps some and drops others in a mixed list", () => {
  const suggestions = [
    { title: "Repetido", description: "d", icon: "star" },
    { title: "Nuevo", description: "d", icon: "gift" },
  ];
  const result = filterOutExistingBenefits(suggestions, ["repetido"]);
  assert.deepEqual(
    result.map((s) => s.title),
    ["Nuevo"],
  );
});
