import { test } from "node:test";
import assert from "node:assert/strict";

import { deriveListAutosaveStatus } from "./derive-list-autosave-status.ts";

test("deriveListAutosaveStatus: no items busy -> idle", () => {
  assert.equal(deriveListAutosaveStatus(new Set()), "idle");
});

test("deriveListAutosaveStatus: at least one item busy -> pending (blocks step navigation until it clears)", () => {
  assert.equal(deriveListAutosaveStatus(new Set(["item-1"])), "pending");
});

test("deriveListAutosaveStatus: multiple items, only one busy -> still pending", () => {
  assert.equal(deriveListAutosaveStatus(new Set(["item-2"])), "pending");
});
