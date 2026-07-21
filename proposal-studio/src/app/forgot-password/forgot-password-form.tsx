"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, CircleCheck } from "lucide-react";

import { requestPasswordResetAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  function onSubmit(values: ForgotPasswordValues) {
    setServerError(undefined);
    const formData = new FormData();
    formData.set("email", values.email);

    startTransition(async () => {
      const result = await requestPasswordResetAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      } else if (result?.success) {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
        <CircleCheck className="h-8 w-8 text-primary" />
        <p className="text-body text-on-surface">
          Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu
          contraseña.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-small text-error">
            {errors.email.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-small text-error">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Spinner className="h-4 w-4 text-current" /> : <Send className="h-4 w-4" />}
        Enviar enlace
      </Button>
    </form>
  );
}

export { ForgotPasswordForm };
