import test from "node:test";
import assert from "node:assert/strict";

import {
  mapMembershipErrorToRedirectPath,
  mapMembershipErrorToHttpResponse,
  mapMembershipErrorToActionMessage,
} from "./error-mapper.ts";
import {
  MembershipRequiredError,
  MembershipPastDueError,
  MembershipSuspendedError,
  MembershipDataInconsistentError,
  MembershipServiceUnavailableError,
} from "./guard-errors.ts";

test("mapMembershipErrorToRedirectPath: sin membresía -> /planes", () => {
  assert.equal(mapMembershipErrorToRedirectPath(new MembershipRequiredError("no_membership")), "/planes");
});

test("mapMembershipErrorToRedirectPath: canceled/expired -> /planes", () => {
  assert.equal(mapMembershipErrorToRedirectPath(new MembershipRequiredError("canceled")), "/planes");
  assert.equal(mapMembershipErrorToRedirectPath(new MembershipRequiredError("expired")), "/planes");
});

test("mapMembershipErrorToRedirectPath: pending -> /suscripcion/resultado", () => {
  assert.equal(mapMembershipErrorToRedirectPath(new MembershipRequiredError("not_started")), "/suscripcion/resultado");
});

test("mapMembershipErrorToRedirectPath: paused -> /account/membership?status=paused", () => {
  assert.equal(mapMembershipErrorToRedirectPath(new MembershipRequiredError("paused")), "/account/membership?status=paused");
});

test("mapMembershipErrorToRedirectPath: past due -> /account/membership?payment=required", () => {
  assert.equal(mapMembershipErrorToRedirectPath(new MembershipPastDueError()), "/account/membership?payment=required");
});

test("mapMembershipErrorToRedirectPath: suspended -> /account/membership?status=suspended", () => {
  assert.equal(mapMembershipErrorToRedirectPath(new MembershipSuspendedError()), "/account/membership?status=suspended");
});

test("mapMembershipErrorToRedirectPath: datos inconsistentes -> /account/membership?status=inconsistent", () => {
  assert.equal(
    mapMembershipErrorToRedirectPath(new MembershipDataInconsistentError()),
    "/account/membership?status=inconsistent",
  );
});

test("mapMembershipErrorToRedirectPath: servicio no disponible -> /account/membership?status=unavailable", () => {
  assert.equal(
    mapMembershipErrorToRedirectPath(new MembershipServiceUnavailableError()),
    "/account/membership?status=unavailable",
  );
});

test("mapMembershipErrorToHttpResponse: códigos HTTP correctos por tipo de error", () => {
  assert.equal(mapMembershipErrorToHttpResponse(new MembershipRequiredError("no_membership")).status, 402);
  assert.equal(mapMembershipErrorToHttpResponse(new MembershipPastDueError()).status, 402);
  assert.equal(mapMembershipErrorToHttpResponse(new MembershipSuspendedError()).status, 403);
  assert.equal(mapMembershipErrorToHttpResponse(new MembershipDataInconsistentError()).status, 409);
  assert.equal(mapMembershipErrorToHttpResponse(new MembershipServiceUnavailableError()).status, 503);
});

test("mapMembershipErrorToHttpResponse: nunca expone el mensaje crudo del error interno", () => {
  const response = mapMembershipErrorToHttpResponse(new MembershipServiceUnavailableError(new Error("secret sql detail")));
  assert.ok(!response.error.includes("secret sql detail"));
});

test("mapMembershipErrorToActionMessage: error no-membership -> null (el llamador debe relanzar)", () => {
  assert.equal(mapMembershipErrorToActionMessage(new Error("no relacionado")), null);
  assert.equal(mapMembershipErrorToActionMessage("cualquier cosa"), null);
});

test("mapMembershipErrorToActionMessage: error de membresía -> mensaje seguro no-nulo", () => {
  const message = mapMembershipErrorToActionMessage(new MembershipPastDueError());
  assert.equal(typeof message, "string");
  assert.ok((message as string).length > 0);
});
