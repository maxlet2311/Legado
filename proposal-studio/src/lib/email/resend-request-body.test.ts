import test from "node:test";
import assert from "node:assert/strict";

import { buildResendRequestBody } from "./resend-request-body.ts";

const BASE = {
  from: "Proposal Studio <activacion@proposalstudio.com>",
  to: "a@b.com",
  subject: "Asunto",
  html: "<p>x</p>",
  text: "x",
};

test("buildResendRequestBody: sin replyTo ni headers -> no incluye esas claves", () => {
  const body = buildResendRequestBody(BASE);
  assert.equal("reply_to" in body, false);
  assert.equal("headers" in body, false);
  assert.equal(body.from, BASE.from);
  assert.equal(body.to, BASE.to);
});

test("buildResendRequestBody: con replyTo -> incluye reply_to", () => {
  const body = buildResendRequestBody({ ...BASE, replyTo: "soporte@proposalstudio.com" });
  assert.equal(body.reply_to, "soporte@proposalstudio.com");
});

test("buildResendRequestBody: con headers -> se pasan tal cual", () => {
  const body = buildResendRequestBody({ ...BASE, headers: { "X-Entity-Ref-ID": "abc123" } });
  assert.deepEqual(body.headers, { "X-Entity-Ref-ID": "abc123" });
});
