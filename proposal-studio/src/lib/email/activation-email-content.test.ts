import test from "node:test";
import assert from "node:assert/strict";

import { buildActivationEmailContent } from "./activation-email-content.ts";

test("buildActivationEmailContent: incluye botón y link de respaldo", () => {
  const { html, text } = buildActivationEmailContent("https://app.proposalstudio.com/activate-account?token=TOKEN123");
  assert.match(html, /Activar mi cuenta/);
  assert.match(html, /https:\/\/app\.proposalstudio\.com\/activate-account\?token=TOKEN123/);
  assert.match(text, /https:\/\/app\.proposalstudio\.com\/activate-account\?token=TOKEN123/);
});

test("buildActivationEmailContent: con expiresAt muestra la fecha formateada", () => {
  const { html, text } = buildActivationEmailContent(
    "https://app.proposalstudio.com/activate-account?token=TOKEN123",
    "2026-08-01T15:00:00.000Z",
  );
  assert.match(html, /vence el/i);
  assert.match(text, /vence el/i);
});

test("buildActivationEmailContent: sin expiresAt usa el mensaje genérico", () => {
  const { html } = buildActivationEmailContent("https://app.proposalstudio.com/activate-account?token=TOKEN123");
  assert.match(html, /expira pronto/i);
});

test("buildActivationEmailContent: escapa el link en el HTML (sin inyección de markup)", () => {
  const { html } = buildActivationEmailContent('https://app.proposalstudio.com/activate-account?token="><script>alert(1)</script>');
  assert.equal(html.includes("<script>alert(1)</script>"), false);
  assert.match(html, /&lt;script&gt;/);
});
