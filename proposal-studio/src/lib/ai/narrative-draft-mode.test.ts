import { test } from "node:test";
import assert from "node:assert/strict";

import { decideNarrativeDraftMode } from "./narrative-draft-mode.ts";

test("requires confirmation when the field already has text", () => {
  assert.equal(decideNarrativeDraftMode("Ya hay contenido acá."), "confirm");
});

test("treats whitespace-only text as empty (direct replace is safe, nothing to lose)", () => {
  assert.equal(decideNarrativeDraftMode("   \n  "), "replace");
});

test("allows a direct replace only when the field is truly empty", () => {
  assert.equal(decideNarrativeDraftMode(""), "replace");
});
