"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { generateNarrativeDraftAction, type NarrativeField } from "@/lib/ai/draft-narrative-action";
import { decideNarrativeDraftMode } from "@/lib/ai/narrative-draft-mode";

interface NarrativeDraftButtonProps {
  proposalId: string;
  field: NarrativeField;
  currentText: string;
  onApply: (text: string, mode: "replace" | "append") => void;
}

/**
 * "Generar borrador": nunca autoejecuta, nunca sobrescribe sin confirmación.
 * Si ya hay texto, ofrece reemplazar o insertar debajo -- nunca directo.
 */
function NarrativeDraftButton({ proposalId, field, currentText, onApply }: NarrativeDraftButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const result = await generateNarrativeDraftAction(proposalId, field);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (decideNarrativeDraftMode(currentText) === "confirm") {
      setDraft(result.data!.text);
    } else {
      onApply(result.data!.text, "replace");
    }
  }

  function confirm(mode: "replace" | "append") {
    if (!draft) return;
    onApply(draft, mode);
    setDraft(null);
  }

  return (
    <div className="mt-2">
      <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
        {loading ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        Generar borrador con IA
      </Button>
      {error ? <p className="mt-1 text-caption text-error">{error}</p> : null}

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sugerencia de IA</DialogTitle>
            <DialogDescription>
              Ya hay texto en este campo. Elegí qué hacer con la sugerencia (siempre editable después).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-4 text-small text-on-surface">
            {draft}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
              Descartar
            </Button>
            <Button type="button" variant="secondary" onClick={() => confirm("append")}>
              Insertar debajo
            </Button>
            <Button type="button" onClick={() => confirm("replace")}>
              Reemplazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { NarrativeDraftButton };
