"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const checkoutSchema = z.object({
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

/**
 * Formulario mínimo de contratación (Etapa 4, sección 8): solo pide el
 * email. El `planId` viaja fijo (no editable) y el precio nunca se envía —
 * el servidor vuelve a resolver todo contra `membership_plans`. Al recibir
 * `checkoutUrl` se redirige de inmediato al checkout oficial de Mercado Pago.
 */
function PlanCheckoutForm({ planId }: { planId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutValues>({ resolver: zodResolver(checkoutSchema) });

  async function onSubmit(values: CheckoutValues) {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/memberships/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, email: values.email }),
      });
      const data = (await response.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;

      if (!response.ok || !data?.checkoutUrl) {
        setError(data?.error ?? "No se pudo iniciar la contratación. Intentá de nuevo.");
        setIsSubmitting(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("No pudimos conectar con el servidor. Revisá tu conexión.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor={`email-${planId}`}>Correo Electrónico</Label>
        <Input
          id={`email-${planId}`}
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p role="alert" className="text-small text-error">
            {errors.email.message}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-error-container px-4 py-3 text-small text-error">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Contratar membresía
      </Button>
    </form>
  );
}

export { PlanCheckoutForm };
