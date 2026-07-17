"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { signInAction } from "@/lib/auth/actions";
import { signInWithGoogleAction } from "@/lib/auth/oauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  redirectTo?: string;
}

function LoginForm({ redirectTo }: LoginFormProps) {
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
    if (redirectTo) {
      formData.set("redirectTo", redirectTo);
    }

    startTransition(async () => {
      const result = await signInAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link href="/forgot-password" className="text-small font-medium text-primary hover:underline">
            ¿Olvidó su contraseña?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
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

      {serverError && (
        <p role="alert" className="text-small text-error">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Iniciar sesión
      </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span className="text-small text-on-surface-variant/70">o</span>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>

      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={redirectTo ?? ""} />
        <Button type="submit" variant="secondary" className="w-full">
          Continuar con Google
        </Button>
      </form>

      <p className="text-center text-small text-on-surface-variant/70">
        ¿Tenés una invitación?{" "}
        <Link href="/activate-account" className="font-medium text-primary hover:underline">
          Activá tu cuenta
        </Link>
      </p>
    </div>
  );
}

export { LoginForm };
