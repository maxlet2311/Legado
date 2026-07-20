import { test } from "node:test";
import assert from "node:assert/strict";

import { libraryItemListFiltersSchema, libraryItemCreateSchema } from "./schemas.ts";

test("libraryItemListFiltersSchema strips a client-supplied user_id (ownership always comes from the session)", () => {
  const parsed = libraryItemListFiltersSchema.parse({ category: "benefit", user_id: "someone-elses-id" });
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, "user_id"), false);
});

test("libraryItemCreateSchema has no field to target another user's library", () => {
  const shape = libraryItemCreateSchema.shape;
  assert.equal("user_id" in shape, false);
  assert.equal("id" in shape, false);
});

test("libraryItemCreateSchema rejects an empty title", () => {
  const result = libraryItemCreateSchema.safeParse({
    category: "diagnosis",
    title: "",
    content_json: { text: "algo" },
  });
  assert.equal(result.success, false);
});
