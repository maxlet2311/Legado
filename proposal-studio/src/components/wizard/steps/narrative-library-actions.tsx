"use client";

import { BookOpen, BookmarkPlus, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LibraryPickerDialog } from "@/components/library/library-picker-dialog";
import { SaveToLibraryDuplicateDialog } from "@/components/library/save-to-library-duplicate-dialog";
import { useSaveToLibrary } from "@/hooks/use-save-to-library";

interface NarrativeLibraryActionsProps {
  category: "diagnosis" | "recommendation";
  currentText: string;
  currentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertText: (text: string) => void;
}

/** Botones "Insertar/Guardar en Biblioteca" para los campos de narrativa (diagnóstico/recomendación). */
function NarrativeLibraryActions({
  category,
  currentText,
  currentTitle,
  open,
  onOpenChange,
  onInsertText,
}: NarrativeLibraryActionsProps) {
  const { status: saveStatus, duplicate, save, saveAnyway, cancelDuplicate } = useSaveToLibrary();

  function saveToLibrary() {
    if (!currentText.trim() || saveStatus === "saving") return;
    save({
      category,
      title: `${currentTitle} — ${new Date().toLocaleDateString("es-AR")}`,
      content_json: { text: currentText },
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(true)}>
        <BookOpen className="h-4 w-4" />
        Insertar desde Biblioteca
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={saveToLibrary}
        disabled={!currentText.trim() || saveStatus === "saving"}
      >
        {saveStatus === "saving" ? (
          <Spinner className="h-4 w-4" />
        ) : saveStatus === "saved" ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <BookmarkPlus className="h-4 w-4" />
        )}
        Guardar en Biblioteca
      </Button>
      <LibraryPickerDialog
        open={open}
        onOpenChange={onOpenChange}
        category={category}
        title={`Insertar ${category === "diagnosis" ? "diagnóstico" : "recomendación"} desde Biblioteca`}
        onInsertText={onInsertText}
      />
      <SaveToLibraryDuplicateDialog duplicate={duplicate} onConfirm={saveAnyway} onCancel={cancelDuplicate} />
    </div>
  );
}

export { NarrativeLibraryActions };
