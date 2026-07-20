"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Archive, Copy, FileStack, Loader2, Pencil, RectangleHorizontal, RectangleVertical } from "lucide-react";

import {
  archiveProposalAction,
  duplicateProposalAction,
  updateProposalMetaAction,
  updateProposalOrientationAction,
} from "@/lib/proposal/actions";
import { saveProposalAsTemplateAction } from "@/lib/templates/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const titleSchema = z.object({ title: z.string().trim().min(1, "El título es obligatorio.") });
type TitleValues = z.infer<typeof titleSchema>;

function EditTitleDialog({ proposalId, currentTitle }: { proposalId: string; currentTitle: string }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TitleValues>({ resolver: zodResolver(titleSchema), defaultValues: { title: currentTitle } });

  function onSubmit(values: TitleValues) {
    setServerError(undefined);
    const formData = new FormData();
    formData.set("id", proposalId);
    formData.set("title", values.title);

    startTransition(async () => {
      const result = await updateProposalMetaAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Pencil className="h-4 w-4" />
          Editar título
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar título</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-small text-error">{errors.title.message}</p>}
          </div>
          {serverError && <p className="text-small text-error">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Selector Vertical/Horizontal del PDF -- usa el mismo `document-shell.tsx`, solo cambia `proposals.orientation`. */
function OrientationToggle({
  proposalId,
  orientation: initialOrientation,
}: {
  proposalId: string;
  orientation: "portrait" | "landscape";
}) {
  const [orientation, setOrientation] = useState(initialOrientation);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSelect(next: "portrait" | "landscape") {
    if (next === orientation || isPending) return;
    setError(undefined);
    const previous = orientation;
    setOrientation(next);
    startTransition(async () => {
      const result = await updateProposalOrientationAction(proposalId, next);
      if (result?.error) {
        setOrientation(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center overflow-hidden rounded-md border border-outline-variant">
        <button
          type="button"
          onClick={() => handleSelect("portrait")}
          disabled={isPending}
          aria-pressed={orientation === "portrait"}
          className={`flex items-center gap-2 px-3 py-2 text-small font-medium transition-colors ${
            orientation === "portrait" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <RectangleVertical className="h-4 w-4" />
          Vertical
        </button>
        <button
          type="button"
          onClick={() => handleSelect("landscape")}
          disabled={isPending}
          aria-pressed={orientation === "landscape"}
          className={`flex items-center gap-2 px-3 py-2 text-small font-medium transition-colors ${
            orientation === "landscape" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <RectangleHorizontal className="h-4 w-4" />
          Horizontal
        </button>
      </div>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  );
}

function ArchiveButton({ proposalId, disabled }: { proposalId: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleArchive() {
    setError(undefined);
    startTransition(async () => {
      const result = await archiveProposalAction(proposalId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" disabled={disabled || isPending} onClick={() => setConfirmOpen(true)}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
        Archivar
      </Button>
      {error && <p className="text-small text-error">{error}</p>}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Archivar propuesta"
        description="La propuesta se archiva pero no se borra: podés seguir viéndola desde el listado. ¿Confirmás?"
        confirmLabel="Archivar"
        onConfirm={handleArchive}
      />
    </div>
  );
}

function DuplicateButton({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleDuplicate() {
    setError(undefined);
    startTransition(async () => {
      const result = await duplicateProposalAction(proposalId);
      if (result.error || !result.data) {
        setError(result.error ?? "No pudimos duplicar la propuesta.");
        return;
      }
      router.push(`/proposal/${result.data.id}/edit`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" disabled={isPending} onClick={handleDuplicate}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
        Duplicar propuesta
      </Button>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  );
}

const templateSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio."),
  description: z.string().trim().optional().default(""),
  category: z.enum(["family", "savings", "retirement", "business"]),
  keep_example_amounts: z.boolean().default(false),
});
type TemplateValues = z.infer<typeof templateSchema>;

const TEMPLATE_CATEGORY_LABELS: Record<TemplateValues["category"], string> = {
  family: "Familia",
  savings: "Ahorro",
  retirement: "Retiro",
  business: "Empresa",
};

function SaveAsTemplateDialog({ proposalId }: { proposalId: string }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TemplateValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { category: "family", keep_example_amounts: false },
  });

  function onSubmit(values: TemplateValues) {
    setServerError(undefined);
    startTransition(async () => {
      const result = await saveProposalAsTemplateAction({ proposal_id: proposalId, ...values });
      if (result.error) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSaved(false); }}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <FileStack className="h-4 w-4" />
          Guardar como plantilla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar como plantilla</DialogTitle>
        </DialogHeader>
        {saved ? (
          <p className="mt-6 text-small text-success">
            Plantilla guardada. Nunca incluye datos del cliente ni montos reales, salvo que hayas marcado
            &quot;usar como valores de ejemplo&quot;.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="template-title">Nombre de la plantilla</Label>
              <Input id="template-title" {...register("title")} />
              {errors.title && <p className="text-small text-error">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Descripción</Label>
              <Input id="template-description" {...register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Producto / segmento</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="keep_example_amounts"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                )}
              />
              <Label className="font-normal">
                Los montos cargados son valores de ejemplo (mantenerlos en la plantilla)
              </Label>
            </div>
            {serverError && <p className="text-small text-error">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar plantilla
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { EditTitleDialog, ArchiveButton, DuplicateButton, SaveAsTemplateDialog, OrientationToggle };
