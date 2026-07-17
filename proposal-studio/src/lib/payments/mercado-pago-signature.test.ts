import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { isValidMercadoPagoSignature } from "./mercado-pago-signature.ts";

const SECRET = "test-secret-vector";

function buildValidHeader(dataId: string, requestId: string, ts: string, secret: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

test("isValidMercadoPagoSignature: firma válida con el secreto correcto", () => {
  const xSignature = buildValidHeader("123456", "req-1", "1704908010", SECRET);
  const result = isValidMercadoPagoSignature({
    xSignature,
    xRequestId: "req-1",
    dataId: "123456",
    secret: SECRET,
  });
  assert.equal(result, true);
});

test("isValidMercadoPagoSignature: firma inválida con secreto incorrecto", () => {
  const xSignature = buildValidHeader("123456", "req-1", "1704908010", "otro-secreto");
  const result = isValidMercadoPagoSignature({
    xSignature,
    xRequestId: "req-1",
    dataId: "123456",
    secret: SECRET,
  });
  assert.equal(result, false);
});

test("isValidMercadoPagoSignature: dataId manipulado invalida la firma", () => {
  const xSignature = buildValidHeader("123456", "req-1", "1704908010", SECRET);
  const result = isValidMercadoPagoSignature({
    xSignature,
    xRequestId: "req-1",
    dataId: "999999", // dataId distinto al firmado
    secret: SECRET,
  });
  assert.equal(result, false);
});

test("isValidMercadoPagoSignature: x-request-id manipulado invalida la firma", () => {
  const xSignature = buildValidHeader("123456", "req-1", "1704908010", SECRET);
  const result = isValidMercadoPagoSignature({
    xSignature,
    xRequestId: "req-attacker",
    dataId: "123456",
    secret: SECRET,
  });
  assert.equal(result, false);
});

test("isValidMercadoPagoSignature: header ausente -> inválido", () => {
  assert.equal(
    isValidMercadoPagoSignature({ xSignature: null, xRequestId: "req-1", dataId: "123456", secret: SECRET }),
    false,
  );
});

test("isValidMercadoPagoSignature: x-request-id ausente -> inválido", () => {
  const xSignature = buildValidHeader("123456", "req-1", "1704908010", SECRET);
  assert.equal(
    isValidMercadoPagoSignature({ xSignature, xRequestId: null, dataId: "123456", secret: SECRET }),
    false,
  );
});

test("isValidMercadoPagoSignature: dataId ausente -> inválido", () => {
  const xSignature = buildValidHeader("123456", "req-1", "1704908010", SECRET);
  assert.equal(
    isValidMercadoPagoSignature({ xSignature, xRequestId: "req-1", dataId: null, secret: SECRET }),
    false,
  );
});

test("isValidMercadoPagoSignature: header malformado (sin v1) -> inválido", () => {
  assert.equal(
    isValidMercadoPagoSignature({
      xSignature: "ts=1704908010",
      xRequestId: "req-1",
      dataId: "123456",
      secret: SECRET,
    }),
    false,
  );
});
