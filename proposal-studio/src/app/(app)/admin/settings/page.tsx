import type { Metadata } from "next";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { TestEmailForm } from "@/app/(app)/admin/settings/test-email-form";

export const metadata: Metadata = { title: "Configuración — Admin" };

function EnvRow({ name, present }: { name: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant py-3 last:border-0">
      <code className="text-small text-on-surface">{name}</code>
      <Badge variant={present ? "success" : "error"}>{present ? "Configurada" : "Falta"}</Badge>
    </div>
  );
}

export default function AdminSettingsPage() {
  const resendKey = Boolean(process.env.RESEND_API_KEY);
  const emailFrom = Boolean(process.env.EMAIL_FROM);
  const siteUrl = Boolean(process.env.NEXT_PUBLIC_SITE_URL);
  const mpToken = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
  const mpWebhookSecret = Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET);
  const enforcementMode = process.env.MEMBERSHIP_ENFORCEMENT_MODE ?? "audit (default)";

  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title="Configuración"
        description="Solo se verifica la presencia de variables — nunca se muestran sus valores."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Configuración" }]}
      />

      <section className="rounded-xl border border-outline-variant bg-surface p-6">
        <h2 className="mb-2 text-body font-semibold text-on-surface">Modo de enforcement actual</h2>
        <p className="text-h4 font-bold text-on-surface">{enforcementMode}</p>
        <p className="mt-1 text-caption text-on-surface-variant">
          Cambiar con la variable de entorno <code>MEMBERSHIP_ENFORCEMENT_MODE</code>. Nunca se cambia automáticamente desde
          acá — ver <code>docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md</code> para el procedimiento completo.
        </p>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface p-6">
        <h2 className="mb-2 text-body font-semibold text-on-surface">Resend (email)</h2>
        <EnvRow name="RESEND_API_KEY" present={resendKey} />
        <EnvRow name="EMAIL_FROM" present={emailFrom} />
        <EnvRow name="NEXT_PUBLIC_SITE_URL" present={siteUrl} />
        <div className="mt-4">
          <TestEmailForm disabled={!resendKey || !emailFrom} />
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface p-6">
        <h2 className="mb-2 text-body font-semibold text-on-surface">Mercado Pago</h2>
        <EnvRow name="MERCADO_PAGO_ACCESS_TOKEN" present={mpToken} />
        <EnvRow name="MERCADO_PAGO_WEBHOOK_SECRET" present={mpWebhookSecret} />
        <p className="mt-3 text-caption text-on-surface-variant">
          Sin credenciales de sandbox disponibles en este entorno — validación pendiente. Ver{" "}
          <code>docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md</code> para el procedimiento reproducible.
        </p>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface p-6">
        <h2 className="mb-2 text-body font-semibold text-on-surface">Google OAuth y Auth Hook (Supabase)</h2>
        <p className="text-small text-on-surface-variant">
          No verificable automáticamente desde este panel (la configuración de proveedores OAuth y Auth Hooks vive en el
          dashboard de Supabase, sin API expuesta a las herramientas disponibles en este entorno). La función SQL{" "}
          <code>before_user_created_check_membership</code> existe y está confirmada en el esquema remoto — falta
          confirmar manualmente que esté asociada como Auth Hook activo. Ver checklist de pasos pendientes en{" "}
          <code>docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md</code>.
        </p>
      </section>
    </ContentContainer>
  );
}
