"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, KeyRound } from "lucide-react";

import { updatePasswordAction } from "@/lib/auth/actions";
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordValues>({ resolver: zodResolver(updatePasswordSchema) });

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
        {errors.password && <p className="text-small text-error">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-small text-error">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && <p className="text-small text-error">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Guardar nueva contraseña
      </Button>
    </form>
  );
}

export { UpdatePasswordForm };
