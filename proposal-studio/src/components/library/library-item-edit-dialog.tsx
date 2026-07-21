"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { IconPicker } from "@/components/wizard/icon-picker";
import { updateLibraryItemAction } from "@/lib/library/actions";
import type { BenefitCategory } from "@/types/wizard";
import type { LibraryContent, LibraryItem } from "@/types/library";

const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  family: "Familia",
  retirement: "Retiro",
  tax: "Impositivo",
  business: "Empresa",
  legal: "Legal",
  financial: "Financiero",
  health: "Salud",
  succession: "Sucesión",
};

interface LibraryItemEditDialogProps {
  item: LibraryItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: LibraryItem) => void;
}

/** Edición de un bloque de Biblioteca: título, producto y contenido (según el tipo). Guarda una copia independiente — nunca toca propuestas donde ya se insertó. */
function LibraryItemEditDialog({ item, onOpenChange, onSaved }: LibraryItemEditDialogProps) {
  const [title, setTitle] = useState("");
  const [product, setProduct] = useState("");
  const [content, setContent] = useState<LibraryContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setProduct(item.product ?? "");
      setContent(item.content_json);
      setError(null);
    }
  }, [item]);

  if (!item || !content) return null;

  async function handleSave() {
    if (!item || !content) return;
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateLibraryItemAction({
      id: item.id,
      title,
      product,
      content_json: content,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved({ ...item, title, product: product || null, content_json: content });
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar bloque de Biblioteca</DialogTitle>
          <DialogDescription>Los cambios no afectan a propuestas donde ya insertaste una copia.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="library-edit-title">Título</Label>
            <Input id="library-edit-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="library-edit-product">Producto</Label>
            <Input id="library-edit-product" value={product} onChange={(event) => setProduct(event.target.value)} />
          </div>

          {"text" in content ? (
            <div className="space-y-2">
              <Label htmlFor="library-edit-text">Contenido</Label>
              <Textarea
                id="library-edit-text"
                rows={6}
                maxLength={8000}
                value={content.text}
                onChange={(event) => setContent({ ...content, text: event.target.value })}
              />
            </div>
          ) : null}

          {"insurance_company" in content ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="library-edit-company">Compañía</Label>
                <Input
                  id="library-edit-company"
                  value={content.insurance_company}
                  onChange={(event) => setContent({ ...content, insurance_company: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="library-edit-product-name">Producto de la aseguradora</Label>
                <Input
                  id="library-edit-product-name"
                  value={content.product_name}
                  onChange={(event) => setContent({ ...content, product_name: event.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="library-edit-description">Descripción</Label>
                <Textarea
                  id="library-edit-description"
                  rows={3}
                  value={content.description ?? ""}
                  onChange={(event) => setContent({ ...content, description: event.target.value })}
                />
              </div>
            </div>
          ) : null}

          {"icon" in content ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="library-edit-benefit-description">Descripción</Label>
                <Textarea
                  id="library-edit-benefit-description"
                  rows={3}
                  value={content.description}
                  onChange={(event) => setContent({ ...content, description: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={content.category}
                  onValueChange={(value) => setContent({ ...content, category: value as BenefitCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BENEFIT_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ícono</Label>
                <IconPicker
                  value={content.icon}
                  category={content.category}
                  onChange={(icon) => setContent({ ...content, icon })}
                />
              </div>
            </div>
          ) : null}

          {error ? <p className="text-small text-error">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4 text-current" /> : null}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { LibraryItemEditDialog };
