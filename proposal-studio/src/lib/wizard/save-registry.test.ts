import { test } from "node:test";
import assert from "node:assert/strict";

import { createSaveRegistry } from "./save-registry.ts";

test("flushAll calls every registered saveNow exactly once", () => {
  const registry = createSaveRegistry();
  let calledA = 0;
  let calledB = 0;
  registry.register("a", () => {
    calledA += 1;
  });
  registry.register("b", () => {
    calledB += 1;
  });

  registry.flushAll();

  assert.equal(calledA, 1);
  assert.equal(calledB, 1);
});

test("re-registering the same key with a new saveNow replaces the old one (fresh closure per render)", () => {
  const registry = createSaveRegistry();
  let staleCalled = 0;
  let freshCalled = 0;
  registry.register("a", () => {
    staleCalled += 1;
  });
  registry.register("a", () => {
    freshCalled += 1;
  });

  registry.flushAll();

  assert.equal(staleCalled, 0, "el saveNow obsoleto (closure de un render anterior) nunca debe ejecutarse");
  assert.equal(freshCalled, 1);
});

test("registering null unregisters the item (unmount / canSave false)", () => {
  const registry = createSaveRegistry();
  let called = 0;
  registry.register("a", () => {
    called += 1;
  });
  registry.register("a", null);

  registry.flushAll();

  assert.equal(called, 0);
  assert.equal(registry.size(), 0);
});

test("flushAll on an empty registry is a no-op (no items ever added, or a proposal with no alternatives/benefits)", () => {
  const registry = createSaveRegistry();
  assert.doesNotThrow(() => registry.flushAll());
});

test("removing one item does not affect the others still registered", () => {
  const registry = createSaveRegistry();
  let calledA = 0;
  let calledB = 0;
  registry.register("a", () => {
    calledA += 1;
  });
  registry.register("b", () => {
    calledB += 1;
  });
  registry.register("a", null);

  registry.flushAll();

  assert.equal(calledA, 0);
  assert.equal(calledB, 1);
});
