import type { Metadata } from "next";

import { RequestActivationForm } from "@/app/request-activation/request-activation-form";

export const metadata: Metadata = {
  title: "Solicitar activación — Proposal Studio™",
};

export default function RequestActivationPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <h1 className="text-h2 font-extrabold tracking-tight text-on-surface">
            Proposal Studio™
          </h1>
          <p className="mt-2 text-small text-on-surface-variant/70">
            Pedí que te reenvíen tu invitación de activación.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface p-8 shadow-sm md:p-10">
          <h2 className="mb-8 text-h4 text-on-surface">Solicitar activación</h2>
          <RequestActivationForm />
        </div>
      </div>
    </main>
  );
}
