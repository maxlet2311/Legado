import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña — Proposal Studio™",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <h1 className="text-h2 font-extrabold tracking-tight text-on-surface">
            Proposal Studio™
          </h1>
          <p className="mt-2 text-small text-on-surface-variant/70">
            Te enviamos un enlace para restablecer tu contraseña.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface p-8 shadow-sm md:p-10">
          <h2 className="mb-8 text-h4 text-on-surface">Recuperar contraseña</h2>
          <ForgotPasswordForm />
          <div className="mt-8 border-t border-outline-variant/20 pt-8 text-center text-small text-on-surface-variant">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
