import test from "node:test";
import assert from "node:assert/strict";

import { getMembershipEnforcementMode } from "./config.ts";

const ORIGINAL_MODE = process.env.MEMBERSHIP_ENFORCEMENT_MODE;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined) {
  Object.defineProperty(process.env, "NODE_ENV", { value, configurable: true, enumerable: true, writable: true });
}

function restoreEnv() {
  if (ORIGINAL_MODE === undefined) delete process.env.MEMBERSHIP_ENFORCEMENT_MODE;
  else process.env.MEMBERSHIP_ENFORCEMENT_MODE = ORIGINAL_MODE;
  setNodeEnv(ORIGINAL_NODE_ENV);
}

test("getMembershipEnforcementMode: sin variable -> audit (default seguro)", () => {
  delete process.env.MEMBERSHIP_ENFORCEMENT_MODE;
  assert.equal(getMembershipEnforcementMode(), "audit");
  restoreEnv();
});

test("getMembershipEnforcementMode: off/audit/enforce se respetan tal cual", () => {
  process.env.MEMBERSHIP_ENFORCEMENT_MODE = "off";
  assert.equal(getMembershipEnforcementMode(), "off");
  process.env.MEMBERSHIP_ENFORCEMENT_MODE = "audit";
  assert.equal(getMembershipEnforcementMode(), "audit");
  process.env.MEMBERSHIP_ENFORCEMENT_MODE = "enforce";
  assert.equal(getMembershipEnforcementMode(), "enforce");
  restoreEnv();
});

test("getMembershipEnforcementMode: valor inválido -> audit (nunca enforce por accidente)", () => {
  process.env.MEMBERSHIP_ENFORCEMENT_MODE = "yolo";
  assert.equal(getMembershipEnforcementMode(), "audit");
  restoreEnv();
});

test("getMembershipEnforcementMode: valor inválido en producción -> audit, nunca falla ni escala a enforce", () => {
  setNodeEnv("production");
  process.env.MEMBERSHIP_ENFORCEMENT_MODE = "yolo";
  assert.equal(getMembershipEnforcementMode(), "audit");
  restoreEnv();
});

test("getMembershipEnforcementMode: es case-insensitive", () => {
  process.env.MEMBERSHIP_ENFORCEMENT_MODE = "ENFORCE";
  assert.equal(getMembershipEnforcementMode(), "enforce");
  restoreEnv();
});
