"use client";

import { useEffect, useState, useTransition } from "react";
import { BookOpen, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { listLibraryItemsAction, insertLibraryItemIntoProposalAction } from "@/lib/library/actions";
import type { LibraryCategory, LibraryItem } from "@/types/library";

interface LibraryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: LibraryCategory;
  title: string;
  /** Solo se usa para category "alternative" | "benefit": inserta la copia server-side. */
  proposalId?: string;
  nextDisplayOrder?: number;
  onInserted?: (id: string, item: LibraryItem) => void;
  /** Solo se usa para category "diagnosis" | "recommendation": el texto se inserta client-side. */
  onInsertText?: (text: string) => void;
}

function LibraryPickerDialog({
  open,
  onOpenChange,
  category,
  title,
  proposalId,
  nextDisplayOrder = 0,
  onInserted,
  onInsertText,
}: LibraryPickerDialogProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listLibraryItemsAction({ category, search: search || undefined }).then((result) => {
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems(result.data ?? []);
    });
  }, [open, category, search]);

  async function handleInsert(item: LibraryItem) {
    if (category === "diagnosis" || category === "recommendation") {
      const content = item.content_json as { text: string };
      onInsertText?.(content.text);
      onOpenChange(false);
      return;
    }
    if (!proposalId) return;
    setInsertingId(item.id);
    const result = await insertLibraryItemIntoProposalAction({
      proposal_id: proposalId,
      library_item_id: item.id,
      display_order: nextDisplayOrder,
    });
    setInsertingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) {
      startTransition(() => onInserted?.(result.data!.id, item));
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Insertar crea una copia independiente: editarla no modifica el original guardado en la Biblioteca.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>

        {error ? <p className="mt-4 text-small text-error">{error}</p> : null}

        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Sin resultados"
              description="No tenés bloques guardados de este tipo todavía."
            />
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-md border border-outline-variant p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-small font-medium text-on-surface">{item.title}</p>
                  {item.product ? (
                    <p className="truncate text-caption text-on-surface-variant">{item.product}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={insertingId === item.id}
                  onClick={() => handleInsert(item)}
                >
                  {insertingId === item.id ? <Spinner className="h-4 w-4" /> : "Insertar"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { LibraryPickerDialog };
