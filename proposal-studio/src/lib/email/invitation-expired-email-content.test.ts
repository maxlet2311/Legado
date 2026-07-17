import test from "node:test";
import assert from "node:assert/strict";

import { buildInvitationExpiredEmailContent } from "./invitation-expired-email-content.ts";

test("buildInvitationExpiredEmailContent: incluye CTA 'Solicitar nueva invitación' con el link de request-activation", () => {
  const { html, text } = buildInvitationExpiredEmailContent("https://app.proposalstudio.com/request-activation");
  assert.match(html, /Solicitar nueva invitación/);
  assert.match(html, /https:\/\/app\.proposalstudio\.com\/request-activation/);
  assert.match(text, /https:\/\/app\.proposalstudio\.com\/request-activation/);
});
