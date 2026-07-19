import test from "node:test";
import assert from "node:assert/strict";

import { single, parsePage, parseEnumParam, parseTriState, parseIsoDate } from "./admin-filters.ts";

test("single: toma el primer valor si viene como array, ignora vacíos", () => {
  assert.equal(single(["a", "b"]), "a");
  assert.equal(single(""), undefined);
  assert.equal(single(undefined), undefined);
  assert.equal(single("x"), "x");
});

test("parsePage: default 1, nunca negativo ni NaN", () => {
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage("-5"), 1);
  assert.equal(parsePage("abc"), 1);
  assert.equal(parsePage("0"), 1);
});

test("parseEnumParam: solo acepta valores de la lista permitida", () => {
  const allowed = ["unmatched", "failed"] as const;
  assert.equal(parseEnumParam("unmatched", allowed), "unmatched");
  assert.equal(parseEnumParam("processed", allowed), undefined);
  assert.equal(parseEnumParam(undefined, allowed), undefined);
});

test("parseTriState: yes/no -> boolean, cualquier otra cosa -> undefined", () => {
  assert.equal(parseTriState("yes"), true);
  assert.equal(parseTriState("no"), false);
  assert.equal(parseTriState("maybe"), undefined);
  assert.equal(parseTriState(undefined), undefined);
});

test("parseIsoDate: rechaza fechas no parseables sin lanzar", () => {
  assert.equal(parseIsoDate(undefined), undefined);
  assert.equal(parseIsoDate("not-a-date"), undefined);
  assert.equal(parseIsoDate("2026-01-01"), new Date("2026-01-01").toISOString());
});
