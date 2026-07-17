import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Estado de tu suscripción — Proposal Studio™",
};

/**
 * URL de retorno del checkout de Mercado Pago (Etapa 4, sección 10).
 * Deliberadamente estática y sin lecturas server-side: nunca confía en query
 * params (`status=approved`, `preapproval_id`, etc.) para decidir nada — la
 * única fuente de verdad es el webhook + la consulta server-side al
 * proveedor (`src/app/api/webhooks/mercado-pago/route.ts`). Esta página no
 * marca ninguna membresía como activa, no crea invitaciones y no expone
 * información sensible ni distinta según los parámetros con los que Mercado
 * Pago redirija.
 */
export default function SubscriptionResultPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface p-8 text-center shadow-sm md:p-10">
        <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="mt-6 text-h4 font-semibold text-on-surface">Estamos verificando tu suscripción</h1>
        <p className="mt-3 text-small text-on-surface-variant/70">
          Estamos verificando el estado de tu membresía. Recibirás un correo cuando tu cuenta pueda activarse.
        </p>
        <Link href="/login" className="mt-8 inline-block text-small font-medium text-primary hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  );
}
