import type { Metadata } from "next";

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

      <div className="relative hidden flex-1 bg-primary md:block">
        <div className="pointer-events-none absolute inset-0 bg-primary-container/20 mix-blend-overlay" />
      </div>
    </main>
  );
}
