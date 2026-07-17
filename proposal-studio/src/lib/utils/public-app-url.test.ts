import test from "node:test";
import assert from "node:assert/strict";

import { normalizePublicAppUrl } from "./public-app-url.ts";

test("normalizePublicAppUrl: ausente -> error explícito", () => {
  assert.throws(() => normalizePublicAppUrl(undefined, false), /Falta PUBLIC_APP_URL/);
  assert.throws(() => normalizePublicAppUrl("", false), /Falta PUBLIC_APP_URL/);
  assert.throws(() => normalizePublicAppUrl("   ", false), /Falta PUBLIC_APP_URL/);
});

test("normalizePublicAppUrl: URL relativa -> rechazada", () => {
  assert.throws(() => normalizePublicAppUrl("/suscripcion/resultado", false), /URL absoluta/);
});

test("normalizePublicAppUrl: esquema inválido -> rechazado", () => {
  assert.throws(() => normalizePublicAppUrl("javascript:alert(1)", false), /esquema no permitido/);
  assert.throws(() => normalizePublicAppUrl("data:text/html,hola", false), /esquema no permitido/);
  assert.throws(() => normalizePublicAppUrl("ftp://example.org", false), /esquema no permitido/);
});

test("normalizePublicAppUrl: example.com rechazado", () => {
  assert.throws(() => normalizePublicAppUrl("https://example.com", false), /example\.com/);
  assert.throws(() => normalizePublicAppUrl("https://sub.example.com/path", false), /example\.com/);
});

test("normalizePublicAppUrl: localhost solo permitido en desarrollo", () => {
  assert.equal(normalizePublicAppUrl("http://localhost:3000", false), "http://localhost:3000");
  assert.throws(() => normalizePublicAppUrl("http://localhost:3000", true), /https/);
});

test("normalizePublicAppUrl: http fuera de localhost es rechazado", () => {
  assert.throws(() => normalizePublicAppUrl("http://staging.proposalstudio.com", false), /https/);
});

test("normalizePublicAppUrl: https válido -> aceptado", () => {
  assert.equal(normalizePublicAppUrl("https://staging.proposalstudio.com", false), "https://staging.proposalstudio.com");
  assert.equal(normalizePublicAppUrl("https://app.proposalstudio.com", true), "https://app.proposalstudio.com");
});

test("normalizePublicAppUrl: slash final se normaliza", () => {
  assert.equal(normalizePublicAppUrl("https://app.proposalstudio.com/", false), "https://app.proposalstudio.com");
  assert.equal(normalizePublicAppUrl("https://app.proposalstudio.com///", false), "https://app.proposalstudio.com");
  assert.equal(normalizePublicAppUrl("https://app.proposalstudio.com/base/", false), "https://app.proposalstudio.com/base");
});
