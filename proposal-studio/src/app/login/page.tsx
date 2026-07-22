import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión — Proposal Studio™",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string; activated?: string; redirectTo?: string }>;
}) {
  const { error, updated, activated, redirectTo } = await searchParams;

  return (
    <main className="flex min-h-screen w-full overflow-hidden bg-background">
      <div className="z-10 flex w-full flex-col items-center justify-center bg-background px-6 md:w-[45%] md:px-24">
        <div className="w-full max-w-md">
          <div className="mb-16">
            <h1 className="text-h2 font-extrabold tracking-tight text-on-surface">
              Proposal Studio™
            </h1>
            <p className="mt-2 text-small text-on-surface-variant/70">
              Propuestas comerciales premium para asesores de seguros.
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant/30 bg-surface p-8 shadow-sm md:p-10">
            <h2 className="mb-8 text-h4 text-on-surface">Iniciar sesión</h2>
            {error === "inactive" && (
              <p role="alert" className="mb-6 rounded-md bg-error-container px-4 py-3 text-small text-error">
                Tu acceso se encuentra deshabilitado. Contactá al administrador.
              </p>
            )}
            {(error === "oauth_failed" || error === "oauth_invalid") && (
              <p role="alert" className="mb-6 rounded-md bg-error-container px-4 py-3 text-small text-error">
                No pudimos completar el inicio de sesión con Google. Intentá de nuevo.
              </p>
            )}
            {error === "restricted_access" && (
              <p role="alert" className="mb-6 rounded-md bg-error-container px-4 py-3 text-small text-error">
                El acceso está temporalmente restringido mientras se preparan pruebas controladas.
              </p>
            )}
            {updated === "1" && (
              <p
                role="status"
                className="mb-6 rounded-md bg-primary-container px-4 py-3 text-small text-on-surface"
              >
                Tu contraseña fue actualizada. Iniciá sesión con tu nueva contraseña.
              </p>
            )}
            {activated === "1" && (
              <p
                role="status"
                className="mb-6 rounded-md bg-primary-container px-4 py-3 text-small text-on-surface"
              >
                Tu cuenta fue activada correctamente. Ya podés iniciar sesión.
              </p>
            )}
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>

      <div className="relative hidden flex-1 bg-primary md:block overflow-hidden">
        <Image
          src="/images/login-banner-v2.png"
          alt="Proposal Studio Legado - Arte alegórico"
          fill
          priority
          sizes="(min-width: 768px) 55vw, 100vw"
          className="object-cover object-center transform scale-105 transition-transform duration-1000"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-slate-950/40" />
        <div className="absolute bottom-16 left-12 right-12 z-10 max-w-lg">
          <blockquote className="space-y-3 rounded-2xl bg-black/30 p-6 backdrop-blur-md border border-white/10 shadow-2xl">
            <p className="text-lg font-medium leading-relaxed text-white drop-shadow">
              “Transformando cotizaciones técnicas en propuestas comerciales estratégicas de alto valor.”
            </p>
            <footer className="text-xs uppercase tracking-widest font-semibold text-blue-200/80">
              Proposal Studio™ — Legado
            </footer>
          </blockquote>
        </div>
      </div>
    </main>
  );
}

