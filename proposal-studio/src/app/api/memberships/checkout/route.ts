import "server-only";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createMembershipCheckout, CheckoutError } from "@/lib/payments/checkout";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

// .strict(): rechaza explícitamente cualquier campo no listado (precio,
// moneda, provider_plan_id, back_url, status, payer_id, etc. — sección 4 y 12
// del alcance de Paso 2.1) en vez de simplemente ignorarlo.
const bodySchema = z
  .object({
    planId: z.string().uuid(),
    email: z.string().trim().toLowerCase().email(),
  })
  .strict();

async function requestIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Inicia el checkout de una membresía (Etapa 4). Solo acepta `planId` y
 * `email` — nunca precio, moneda, ni ningún dato del proveedor de pagos
 * (sección 9 del alcance de Etapa 4). Devuelve únicamente la URL oficial de
 * checkout de Mercado Pago a la que el navegador debe redirigir al pagador.
 */
async function POST(request: Request) {
  const ip = await requestIp();
  if (!checkRateLimit(`checkout:create:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento e intentá de nuevo." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  try {
    const result = await createMembershipCheckout({ planId: parsed.data.planId, email: parsed.data.email });
    return NextResponse.json({ checkoutUrl: result.checkoutUrl });
  } catch (error) {
    if (error instanceof CheckoutError) {
      const status =
        error.code === "membership_already_active"
          ? 409
          : error.code === "checkout_in_progress"
            ? 409
            : error.code === "sandbox_checkout_disabled" || error.code === "deterministic_checkout_disabled"
              ? 503
              : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    logServerError("POST /api/memberships/checkout", error);
    return NextResponse.json({ error: "No se pudo iniciar la contratación." }, { status: 500 });
  }
}

export { POST };
