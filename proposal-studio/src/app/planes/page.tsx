import type { Metadata } from "next";

import { listActivePlans } from "@/lib/memberships/repository";
import { PlanCheckoutForm } from "@/app/planes/plan-checkout-form";
import { getCurrentUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Planes — Proposal Studio™",
};

const INTERVAL_LABELS: Record<string, string> = {
  month: "mes",
  year: "año",
};

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

/**
 * Página pública de planes (Etapa 4, sección 8). Solo muestra planes
 * activos, con datos que vienen exclusivamente del backend — el navegador
 * nunca puede alterar precio ni ids del proveedor. Un plan activo pero sin
 * `provider`/`provider_plan_id` configurado se muestra igual (para no
 * esconder el catálogo comercial) pero marcado como no disponible todavía.
 */
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [plans, user] = await Promise.all([listActivePlans(), getCurrentUser()]);
  const userEmail = user?.email ?? null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-h2 font-extrabold tracking-tight text-on-surface">Planes</h1>
        <p className="mt-2 text-small text-on-surface-variant/70">
          Elegí el plan de Proposal Studio™ que mejor se ajuste a tu operación.
        </p>
        {error === "membership_required" && (
          <p role="alert" className="mx-auto mt-4 max-w-md rounded-md bg-error-container px-4 py-3 text-small text-error">
            Necesitás contratar una membresía para acceder. Elegí un plan para continuar.
          </p>
        )}
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="Todavía no hay planes disponibles." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const providerReady = plan.provider === "mercado_pago" && Boolean(plan.providerPlanId);
            const features = Array.isArray(plan.features)
              ? (plan.features as unknown[])
              : Object.entries(plan.features ?? {}).map(([key, value]) => `${key}: ${String(value)}`);

            return (
              <div
                key={plan.id}
                className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface p-8 shadow-sm"
              >
                <h2 className="text-h4 font-semibold text-on-surface">{plan.name}</h2>
                {plan.description && (
                  <p className="mt-2 text-small text-on-surface-variant/70">{plan.description}</p>
                )}
                <p className="mt-6 text-h3 font-extrabold text-on-surface">
                  {formatPrice(plan.price, plan.currency)}
                  <span className="text-small font-normal text-on-surface-variant/70">
                    {" "}
                    / {plan.billingIntervalCount > 1 ? `${plan.billingIntervalCount} ` : ""}
                    {INTERVAL_LABELS[plan.billingInterval] ?? plan.billingInterval}
                  </span>
                </p>

                {features.length > 0 && (
                  <ul className="mt-6 flex-1 space-y-2 text-small text-on-surface-variant">
                    {features.map((feature, index) => (
                      <li key={index}>• {String(feature)}</li>
                    ))}
                  </ul>
                )}

                <div className="mt-8">
                  {providerReady ? (
                    <PlanCheckoutForm planId={plan.id} userEmail={userEmail} />
                  ) : (
                    <p className="text-center text-small text-on-surface-variant/70">Próximamente disponible</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
