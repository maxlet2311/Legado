"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function TestEmailForm({ disabled }: { disabled: boolean }) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | undefined>();
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(undefined);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/test-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to }),
        });
        const body = await res.json();
        if (!res.ok) {
          setMessage({ type: "error", text: body.error ?? "No se pudo enviar el correo." });
          return;
        }
        setMessage({ type: "success", text: "Correo de prueba enviado." });
      } catch {
        setMessage({ type: "error", text: "No se pudo contactar al servidor." });
      }
    });
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="test-email-to">Enviar correo de prueba a</Label>
      <div className="flex gap-2">
        <Input
          id="test-email-to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="destinatario@ejemplo.com"
          disabled={disabled}
        />
        <Button
          type="button"
          disabled={disabled || isPending || !to.trim()}
          onClick={() => {
            if (!window.confirm(`¿Enviar un correo real de prueba a ${to}?`)) return;
            submit();
          }}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Enviar
        </Button>
      </div>
      {disabled && <p className="text-caption text-warning">Configurá RESEND_API_KEY y EMAIL_FROM primero.</p>}
      {message && (
        <p className={`text-small ${message.type === "success" ? "text-success" : "text-error"}`}>{message.text}</p>
      )}
    </div>
  );
}

export { TestEmailForm };
