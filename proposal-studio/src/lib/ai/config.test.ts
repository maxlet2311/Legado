import { test } from "node:test";
import assert from "node:assert/strict";

import { getAiConfig, isPromptTooLong } from "./config.ts";

test("getAiConfig fails with a clear configuration error when both env vars are missing", () => {
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.AI_MODEL;
  const result = getAiConfig();
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /no está configurada/);
});

test("getAiConfig fails when AI_GATEWAY_API_KEY is set but AI_MODEL is missing (never guesses a model slug)", () => {
  process.env.AI_GATEWAY_API_KEY = "fake-key";
  delete process.env.AI_MODEL;
  try {
    const result = getAiConfig();
    assert.equal(result.ok, false);
  } finally {
    delete process.env.AI_GATEWAY_API_KEY;
  }
});

test("getAiConfig fails when AI_MODEL is set but AI_GATEWAY_API_KEY is missing", () => {
  process.env.AI_MODEL = "anthropic/claude-sonnet-4.6";
  delete process.env.AI_GATEWAY_API_KEY;
  try {
    const result = getAiConfig();
    assert.equal(result.ok, false);
  } finally {
    delete process.env.AI_MODEL;
  }
});

test("getAiConfig succeeds and returns exactly the configured model, never a hardcoded fallback", () => {
  process.env.AI_GATEWAY_API_KEY = "fake-key";
  process.env.AI_MODEL = "openai/gpt-5.4";
  try {
    const result = getAiConfig();
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.model, "openai/gpt-5.4");
  } finally {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_MODEL;
  }
});

test("isPromptTooLong rejects prompts over the limit and accepts short ones", () => {
  assert.equal(isPromptTooLong("short prompt"), false);
  assert.equal(isPromptTooLong("x".repeat(20000)), true);
});
