import { test } from "node:test";
import assert from "node:assert/strict";

import { beginUnsettledAction, isStepUnsettled } from "./step-unsettled.ts";

test("step-unsettled: idle by default", () => {
  assert.equal(isStepUnsettled(), false);
});

test("step-unsettled: a mutating action in flight marks the step unsettled until it releases", () => {
  const release = beginUnsettledAction();
  assert.equal(isStepUnsettled(), true, "duplicate/confirmRemove/reorder in flight -> step NOT settled -> navigation must wait");
  release();
  assert.equal(isStepUnsettled(), false, "action finished -> step settled again");
});

test("step-unsettled: overlapping actions (e.g. duplicate + a concurrent delete) keep it unsettled until all release", () => {
  const releaseA = beginUnsettledAction();
  const releaseB = beginUnsettledAction();
  assert.equal(isStepUnsettled(), true);
  releaseA();
  assert.equal(isStepUnsettled(), true, "one action finished, but another is still in flight");
  releaseB();
  assert.equal(isStepUnsettled(), false);
});

test("step-unsettled: release is idempotent (a finally block must not double-decrement)", () => {
  const release = beginUnsettledAction();
  release();
  release();
  assert.equal(isStepUnsettled(), false);
});
