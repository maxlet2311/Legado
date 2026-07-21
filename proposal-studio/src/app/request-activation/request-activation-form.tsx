"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, CircleCheck } from "lucide-react";

import { requestActivationAction } from "@/lib/account-activation/request-activation-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const requestActivationSchema = z.object({
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
});

type RequestActivationValues = z.infer<typeof requestActivationSchema>;

function RequestActivationForm() {
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestActivationValues>({ resolver: zodResolver(requestActivationSchema) });

  function onSubmit(values: RequestActivationValues) {
    const formData = new FormData();
    formData.set("email", values.email);

    startTransition(async () => {
      await requestActivationAction({ success: false }, formData);
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
        <CircleCheck className="h-8 w-8 text-primary" />
        <p className="text-body text-on-surface">
          Si existe una invitación válida asociada a ese correo, recibirás nuevas instrucciones.
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

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Spinner className="h-4 w-4 text-current" /> : <Send className="h-4 w-4" />}
        Solicitar activación
      </Button>
    </form>
  );
}

export { RequestActivationForm };
