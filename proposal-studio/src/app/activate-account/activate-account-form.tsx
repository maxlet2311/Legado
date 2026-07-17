"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserCheck } from "lucide-react";

import { activateAccountAction } from "@/lib/account-activation/actions";
import { signInWithGoogleAction } from "@/lib/auth/oauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const activateAccountSchema = z
  .object({
    fullName: z.string().trim().min(1, "Ingresá tu nombre completo."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type ActivateAccountValues = z.infer<typeof activateAccountSchema>;

interface ActivateAccountFormProps {
  token: string;
  email: string;
}

function ActivateAccountForm({ token, email }: ActivateAccountFormProps) {
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivateAccountValues>({ resolver: zodResolver(activateAccountSchema) });

  function onSubmit(values: ActivateAccountValues) {
    if (isPending) return;
    setServerError(undefined);
    const formData = new FormData();
    formData.set("token", token);
    formData.set("fullName", values.fullName);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);

    startTransition(async () => {
      const result = await activateAccountAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="fullName">Nombre completo</Label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Nombre y apellido"
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
          {...register("fullName")}
        />
        {errors.fullName && (
          <p id="fullName-error" role="alert" className="text-small text-error">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input id="email" type="email" autoComplete="email" value={email} readOnly disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="text-small text-error">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p id="confirmPassword-error" role="alert" className="text-small text-error">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-small text-error">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
        Activar cuenta
      </Button>
    </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span className="text-small text-on-surface-variant/70">o</span>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>

      <form action={signInWithGoogleAction}>
        <input type="hidden" name="activationToken" value={token} />
        <Button type="submit" variant="secondary" className="w-full">
          Activar con Google
        </Button>
      </form>
    </div>
  );
}

export { ActivateAccountForm };
