"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { signInAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginValues) {
    setServerError(undefined);
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await signInAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input
          id="email"
          type="email"
          placeholder="nombre@empresa.com"
          {...register("email")}
        />
        {errors.email && <p className="text-small text-error">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link href="/forgot-password" className="text-small font-medium text-primary hover:underline">
            ¿Olvidó su contraseña?
          </Link>
        </div>
        <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
        {errors.password && <p className="text-small text-error">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-small text-error">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Iniciar sesión
      </Button>
    </form>
  );
}

export { LoginForm };
