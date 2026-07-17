import { createHmac, timingSafeEqual } from "node:crypto";

interface ParsedSignatureHeader {
  ts: string | null;
  v1: string | null;
}

/** El header llega como `ts=1704908010,v1=<hex>` — nunca loguear el valor completo. */
function parseSignatureHeader(header: string): ParsedSignatureHeader {
  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of header.split(",")) {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (key === "ts") ts = value ?? null;
    if (key === "v1") v1 = value ?? null;
  }

  return { ts, v1 };
}

/**
 * Validación del mecanismo oficial de Mercado Pago para `x-signature`
 * (documentado en "Your integrations > Notifications > Webhooks"): el
 * manifest firmado es `id:{data.id};request-id:{x-request-id};ts:{ts};` y se
 * compara HMAC-SHA256(manifest, secret) contra `v1` con comparación en
 * tiempo constante. `dataId` es el `data.id` del query string de la
 * notificación (no del payload del body).
 *
 * Limitación documentada: el contenido exacto del manifest no pudo
 * extraerse textualmente de la documentación pública durante esta
 * implementación (la página renderiza el ejemplo de forma dinámica); el
 * formato usado acá es el ampliamente publicado por Mercado Pago para este
 * mecanismo. Debe verificarse contra el secreto real de Sandbox antes de
 * producción (ver pendientes del informe de Etapa 4).
 */
function isValidMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;

  if (!xSignature || !xRequestId || !dataId) {
    return false;
  }

  const { ts, v1 } = parseSignatureHeader(xSignature);
  if (!ts || !v1) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(v1, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export { isValidMercadoPagoSignature, parseSignatureHeader };
