import test from "node:test";
import assert from "node:assert/strict";

import { mapMercadoPagoSubscriptionStatus } from "./status-map.ts";

test("mapMercadoPagoSubscriptionStatus: mapea los 4 estados reales de un preapproval", () => {
  assert.equal(mapMercadoPagoSubscriptionStatus("pending"), "pending");
  assert.equal(mapMercadoPagoSubscriptionStatus("authorized"), "authorized");
  assert.equal(mapMercadoPagoSubscriptionStatus("paused"), "paused");
  assert.equal(mapMercadoPagoSubscriptionStatus("cancelled"), "canceled");
});

test("mapMercadoPagoSubscriptionStatus: estado no reconocido -> unknown", () => {
  assert.equal(mapMercadoPagoSubscriptionStatus("cancelled_by_typo"), "unknown");
  assert.equal(mapMercadoPagoSubscriptionStatus("active"), "unknown");
  assert.equal(mapMercadoPagoSubscriptionStatus(""), "unknown");
  assert.equal(mapMercadoPagoSubscriptionStatus(null), "unknown");
  assert.equal(mapMercadoPagoSubscriptionStatus(undefined), "unknown");
});
