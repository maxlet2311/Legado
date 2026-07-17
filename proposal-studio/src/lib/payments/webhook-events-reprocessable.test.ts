import test from "node:test";
import assert from "node:assert/strict";

import { isReprocessable } from "./webhook-event-status.ts";

test("isReprocessable: 'failed' debe reprocesarse (evita eventos huérfanos para siempre)", () => {
  assert.equal(isReprocessable("failed"), true);
});

test("isReprocessable: 'received'/'processing' (proceso caído a mitad de camino) debe reprocesarse", () => {
  assert.equal(isReprocessable("received"), true);
  assert.equal(isReprocessable("processing"), true);
});

test("isReprocessable: estados terminales ('processed', 'ignored', 'unmatched') nunca se reprocesan", () => {
  assert.equal(isReprocessable("processed"), false);
  assert.equal(isReprocessable("ignored"), false);
  assert.equal(isReprocessable("unmatched"), false);
});
