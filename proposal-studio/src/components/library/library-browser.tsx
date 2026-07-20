"use client";

import { useEffect, useState } from "react";
import { BookOpen, Pencil, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LibraryItemEditDialog } from "@/components/library/library-item-edit-dialog";
import { deleteLibraryItemAction, listLibraryItemsAction } from "@/lib/library/actions";
import { libraryItemExcerpt } from "@/lib/library/excerpt";
import { formatDateTime } from "@/lib/render/formatters";
import type { LibraryCategory, LibraryItem } from "@/types/library";

const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  alternative: "Alternativa",
  benefit: "Beneficio",
  diagnosis: "Diagnóstico",
  recommendation: "Recomendación",
};

function LibraryBrowser() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<LibraryCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LibraryItem | null>(null);
  const [editing, setEditing] = useState<LibraryItem | null>(null);

  useEffect(() => {
    setLoading(true);
    listLibraryItemsAction({ search: search || undefined, category: category ?? undefined }).then((result) => {
      setLoading(false);
      setItems(result.data ?? []);
    });
  }, [search, category]);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    const result = await deleteLibraryItemAction(pendingDelete.id);
    setDeletingId(null);
    if (!result.error) {
      setItems((prev) => prev.filter((item) => item.id !== pendingDelete.id));
    }
    setPendingDelete(null);
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
        <Input
          placeholder="Buscar en la biblioteca..."
          className="pl-10"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant={category === null ? "featured" : "draft"}
          className="cursor-pointer"
          onClick={() => setCategory(null)}
        >
          Todos
        </Badge>
        {(Object.keys(CATEGORY_LABELS) as LibraryCategory[]).map((value) => (
          <Badge
            key={value}
            variant={category === value ? "featured" : "draft"}
            className="cursor-pointer"
            onClick={() => setCategory(value)}
          >
            {CATEGORY_LABELS[value]}
          </Badge>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin bloques todavía"
          description="Guardá alternativas, beneficios, diagnósticos y recomendaciones desde el editor para reutilizarlos acá."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-2 p-6">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="draft">{CATEGORY_LABELS[item.category]}</Badge>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(item)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(item)}
                    disabled={deletingId === item.id}
                    aria-label="Eliminar de la Biblioteca"
                  >
                    {deletingId === item.id ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-body font-medium text-on-surface">{item.title}</p>
              <p className="line-clamp-2 text-small text-on-surface-variant">{libraryItemExcerpt(item)}</p>
              <div className="mt-auto flex items-center justify-between pt-2 text-caption text-on-surface-variant">
                {item.product ? <span>{item.product}</span> : <span />}
                <span>{formatDateTime(item.updated_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Eliminar de la Biblioteca"
        description={`"${pendingDelete?.title ?? ""}" se va a eliminar de tu Biblioteca. No afecta a las propuestas donde ya se insertó una copia.`}
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
      />

      <LibraryItemEditDialog
        item={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={(updated) => {
          setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          setEditing(null);
        }}
      />
    </div>
  );
}

export { LibraryBrowser };
