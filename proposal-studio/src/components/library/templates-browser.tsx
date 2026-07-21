"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileStack } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { applyTemplateToNewProposalAction, listTemplatesAction, type TemplateSummary } from "@/lib/templates/actions";
import { formatDateTime } from "@/lib/render/formatters";
import type { TemplateJson } from "@/lib/templates/sanitize";

const CATEGORY_LABELS: Record<string, string> = {
  family: "Familia",
  savings: "Ahorro",
  retirement: "Retiro",
  business: "Empresa",
};

/** Resumen de qué precarga la plantilla, para decidir antes de aplicarla sin abrir otra pantalla. */
function describeTemplateContent(content: TemplateJson): string {
  const parts: string[] = [];
  parts.push(`${content.alternatives.length} alternativa${content.alternatives.length === 1 ? "" : "s"}`);
  parts.push(`${content.benefits.length} beneficio${content.benefits.length === 1 ? "" : "s"}`);
  if (content.comparison && content.comparison.columns.length > 0) {
    parts.push("comparativa");
  }
  return parts.join(" · ");
}

interface TemplatesBrowserProps {
  clients: { id: string; full_name: string }[];
}

function TemplatesBrowser({ clients }: TemplatesBrowserProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyTarget, setApplyTarget] = useState<TemplateSummary | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTemplatesAction().then((result) => {
      setLoading(false);
      setTemplates(result.data ?? []);
    });
  }, []);

  async function handleApply() {
    if (!applyTarget || !clientId) return;
    setApplying(true);
    setError(null);
    const result = await applyTemplateToNewProposalAction({ template_id: applyTarget.id, client_id: clientId });
    setApplying(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/proposal/${result.data!.id}/edit`);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={FileStack}
        title="Sin plantillas todavía"
        description="Guardá una propuesta como plantilla desde su página de detalle para reutilizarla acá."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col gap-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={template.is_system ? "featured" : "draft"}>
                {template.is_system ? "Sistema" : "Propia"}
              </Badge>
              <Badge variant="draft">{CATEGORY_LABELS[template.category] ?? template.category}</Badge>
            </div>
            <p className="text-body font-medium text-on-surface">{template.title}</p>
            {template.description ? (
              <p className="text-small text-on-surface-variant">{template.description}</p>
            ) : null}
            {template.template_json.product ? (
              <p className="text-caption text-on-surface-variant">Producto: {template.template_json.product}</p>
            ) : null}
            <p className="text-caption text-on-surface-variant">{describeTemplateContent(template.template_json)}</p>
            <p className="text-caption text-on-surface-variant">
              Actualizada el {formatDateTime(template.updated_at)}
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => setApplyTarget(template)}>
              Usar plantilla
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={applyTarget !== null} onOpenChange={(open) => !open && setApplyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usar &quot;{applyTarget?.title}&quot;</DialogTitle>
            <DialogDescription>
              Elegí el cliente para esta propuesta. Vas a poder revisar y editar todo antes de emitir.
            </DialogDescription>
          </DialogHeader>
          {applyTarget ? (
            <div className="mt-2 space-y-1 rounded-md border border-outline-variant bg-surface-container-low p-4 text-small text-on-surface-variant">
              <p className="font-semibold text-on-surface">Esta plantilla incluye:</p>
              <p>{describeTemplateContent(applyTarget.template_json)}</p>
              {applyTarget.template_json.narrative?.current_situation ? (
                <p>Diagnóstico precargado.</p>
              ) : null}
            </div>
          ) : null}
          {clients.length === 0 ? (
            <EmptyState
              compact
              className="mt-4"
              title="Todavía no tenés clientes cargados."
              description="Creá uno primero desde tu ficha de clientes."
            />
          ) : (
            <div className="mt-4 space-y-4">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error ? <p className="text-small text-error">{error}</p> : null}
              <Button type="button" className="w-full" onClick={handleApply} disabled={!clientId || applying}>
                {applying ? <Spinner className="h-4 w-4" /> : null}
                Crear propuesta desde la plantilla
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export { TemplatesBrowser };
