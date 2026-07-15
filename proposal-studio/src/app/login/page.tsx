import type { Metadata } from "next";

import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión — Proposal Studio™",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
              <p className="mb-6 rounded-md bg-error-container px-4 py-3 text-small text-error">
                Tu cuenta está desactivada. Contactá a tu administrador.
              </p>
            )}
            <LoginForm />
          </div>
        </div>
      </div>

      <div className="relative hidden flex-1 bg-primary md:block">
        <div className="pointer-events-none absolute inset-0 bg-primary-container/20 mix-blend-overlay" />
      </div>
    </main>
  );
}
