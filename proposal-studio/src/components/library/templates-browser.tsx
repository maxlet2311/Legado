"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileStack, Pencil, Copy, EyeOff, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  applyTemplateToNewProposalAction,
  listTemplatesAction,
  updateTemplateAction,
  setTemplateActiveAction,
  duplicateTemplateAction,
  type TemplateSummary,
  type TemplateActiveFilter,
} from "@/lib/templates/actions";
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
  const alternatives = Array.isArray(content?.alternatives) ? content.alternatives : [];
  const benefits = Array.isArray(content?.benefits) ? content.benefits : [];
  const comparisonColumns = Array.isArray(content?.comparison?.columns) ? content.comparison.columns : [];
  const parts: string[] = [];
  parts.push(`${alternatives.length} alternativa${alternatives.length === 1 ? "" : "s"}`);
  parts.push(`${benefits.length} beneficio${benefits.length === 1 ? "" : "s"}`);
  if (comparisonColumns.length > 0) {
    parts.push("comparativa");
  }
  return parts.join(" · ");
}

interface TemplatesBrowserProps {
  clients: { id: string; full_name: string }[];
}

const ACTIVE_FILTER_LABELS: Record<TemplateActiveFilter, string> = {
  active: "Activas",
  inactive: "Inactivas",
  all: "Todas",
};

function TemplatesBrowser({ clients }: TemplatesBrowserProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [activeFilter, setActiveFilter] = useState<TemplateActiveFilter>("active");
  const [loading, setLoading] = useState(true);
  const [applyTarget, setApplyTarget] = useState<TemplateSummary | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<TemplateSummary | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("family");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function reload(filter: TemplateActiveFilter = activeFilter) {
    setLoading(true);
    return listTemplatesAction(filter).then((result) => {
      setLoading(false);
      setTemplates(result.data ?? []);
    });
  }

  useEffect(() => {
    reload(activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  function openEdit(template: TemplateSummary) {
    setEditTarget(template);
    setEditTitle(template.title);
    setEditDescription(template.description ?? "");
    setEditCategory(template.category);
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setEditSaving(true);
    setEditError(null);
    const result = await updateTemplateAction({
      id: editTarget.id,
      title: editTitle,
      description: editDescription,
      category: editCategory,
    });
    setEditSaving(false);
    if (result.error) {
      setEditError(result.error);
      return;
    }
    setEditTarget(null);
    await reload();
  }

  async function handleDuplicate(template: TemplateSummary) {
    setBusyId(template.id);
    setRowError(null);
    const result = await duplicateTemplateAction(template.id);
    setBusyId(null);
    if (result.error) {
      setRowError(result.error);
      return;
    }
    await reload();
  }

  async function handleToggleActive(template: TemplateSummary) {
    setBusyId(template.id);
    setRowError(null);
    const result = await setTemplateActiveAction(template.id, !template.is_active);
    setBusyId(null);
    if (result.error) {
      setRowError(result.error);
      return;
    }
    await reload();
  }

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

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <span className="text-caption font-medium text-on-surface-variant">Mostrando</span>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as TemplateActiveFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ACTIVE_FILTER_LABELS) as TemplateActiveFilter[]).map((value) => (
              <SelectItem key={value} value={value}>
                {ACTIVE_FILTER_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title={activeFilter === "active" ? "Sin plantillas todavía" : `No hay plantillas ${ACTIVE_FILTER_LABELS[activeFilter].toLowerCase()}`}
          description={
            activeFilter === "active"
              ? "Guardá una propuesta como plantilla desde su página de detalle para reutilizarla acá."
              : "Cambiá el filtro para ver otras plantillas."
          }
        />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col gap-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={template.is_system ? "featured" : "draft"}>
                {template.is_system ? "Sistema" : "Propia"}
              </Badge>
              <Badge variant="draft">{CATEGORY_LABELS[template.category] ?? template.category}</Badge>
              {!template.is_active ? <Badge variant="archived">Inactiva</Badge> : null}
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
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setApplyTarget(template)}>
                Usar plantilla
              </Button>
              {!template.is_system ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(template)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busyId === template.id}
                onClick={() => handleDuplicate(template)}
              >
                {busyId === template.id ? <Spinner className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Duplicar
              </Button>
              {!template.is_system ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busyId === template.id}
                  onClick={() => handleToggleActive(template)}
                >
                  {template.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {template.is_active ? "Desactivar" : "Reactivar"}
                </Button>
              ) : null}
            </div>
            {rowError ? <p className="text-caption text-error">{rowError}</p> : null}
          </Card>
        ))}
      </div>
      )}

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

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plantilla</DialogTitle>
            <DialogDescription>Solo cambia nombre, descripción y categoría -- el contenido se edita usándola para crear una propuesta.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-edit-title">Nombre</Label>
              <Input id="template-edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-edit-description">Descripción</Label>
              <Input
                id="template-edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Producto / segmento</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editError ? <p className="text-small text-error">{editError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)} disabled={editSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={editSaving || !editTitle.trim()}>
              {editSaving ? <Spinner className="h-4 w-4 text-current" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { TemplatesBrowser };
