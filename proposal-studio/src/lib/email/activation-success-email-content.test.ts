import test from "node:test";
import assert from "node:assert/strict";

import { buildActivationSuccessEmailContent } from "./activation-success-email-content.ts";

test("buildActivationSuccessEmailContent: incluye CTA 'Ingresar al sistema' con el link de login", () => {
  const { html, text } = buildActivationSuccessEmailContent("https://app.proposalstudio.com/login");
  assert.match(html, /Ingresar al sistema/);
  assert.match(html, /https:\/\/app\.proposalstudio\.com\/login/);
  assert.match(text, /https:\/\/app\.proposalstudio\.com\/login/);
});
