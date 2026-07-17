"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Loader2, KeyRound } from "lucide-react";

import { updatePasswordAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/database/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

function UpdatePasswordForm() {
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  // El link del email trae el token de recuperación en el fragment (#access_token=...),
  // que solo el cliente puede leer. Se instancia el browser client para que
  // detecte ese fragment y establezca la sesión antes de permitir el envío.
  const [linkStatus, setLinkStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordValues>({ resolver: zodResolver(updatePasswordSchema) });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setLinkStatus(session ? "valid" : "invalid");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(values: UpdatePasswordValues) {
    setServerError(undefined);
    const formData = new FormData();
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);

    startTransition(async () => {
      const result = await updatePasswordAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  if (linkStatus === "checking") {
    return (
      <p role="status" className="flex items-center gap-2 text-small text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando enlace…
      </p>
    );
  }

  if (linkStatus === "invalid") {
    return (
      <div role="alert" className="space-y-4 text-center">
        <p className="text-small text-error">El enlace de recuperación no es válido o expiró.</p>
        <Link href="/forgot-password" className="text-small font-medium text-primary hover:underline">
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
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
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Guardar nueva contraseña
      </Button>
    </form>
  );
}

export { UpdatePasswordForm };
