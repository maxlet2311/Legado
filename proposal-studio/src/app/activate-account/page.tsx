import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

import { validateActivationToken } from "@/lib/account-activation/service";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { ActivateAccountForm } from "@/app/activate-account/activate-account-form";

export const metadata: Metadata = {
  title: "Activar cuenta — Proposal Studio™",
};

const INVALID_TOKEN_MESSAGE = "El enlace de activación no es válido o ya venció. Solicitá uno nuevo al administrador.";
const EXPIRED_TOKEN_MESSAGE = "Tu invitación venció. Solicitá una nueva para poder activar tu cuenta.";

async function requestIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  const ip = await requestIp();
  const withinLimit = checkRateLimit(`activate-account:validate:${ip}`, 30, 15 * 60_000);

  const result =
    withinLimit && token ? await validateActivationToken(token) : { valid: false as const };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <h1 className="text-h2 font-extrabold tracking-tight text-on-surface">
            Proposal Studio™
          </h1>
          <p className="mt-2 text-small text-on-surface-variant/70">Activá tu cuenta.</p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface p-8 shadow-sm md:p-10">
          <h2 className="mb-8 text-h4 text-on-surface">Activar cuenta</h2>

          {result.valid && token ? (
            <>
              {error === "email_mismatch" && (
                <p role="alert" className="mb-6 rounded-md bg-error-container px-4 py-3 text-small text-error">
                  La cuenta de Google no coincide con esta invitación. Activá con el mismo correo de la invitación, o usá contraseña.
                </p>
              )}
              <ActivateAccountForm token={token} email={result.email!} />
            </>
          ) : "reason" in result && result.reason === "expired" ? (
            <div role="alert" className="space-y-4 text-center">
              <p className="text-small text-error">{EXPIRED_TOKEN_MESSAGE}</p>
              <Link href="/request-activation" className="text-small font-medium text-primary hover:underline">
                Solicitar nueva invitación
              </Link>
            </div>
          ) : (
            <div role="alert" className="space-y-4 text-center">
              <p className="text-small text-error">{INVALID_TOKEN_MESSAGE}</p>
              <Link href="/login" className="text-small font-medium text-primary hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
