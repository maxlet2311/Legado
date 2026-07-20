import { useRef, useState } from "react";

import { saveLibraryItemAction } from "@/lib/library/actions";
import type { LibraryCategory, LibraryContent } from "@/types/library";

interface SaveToLibraryInput {
  category: LibraryCategory;
  title: string;
  product?: string;
  content_json: LibraryContent;
}

type SaveStatus = "idle" | "saving" | "saved";

/**
 * Encapsula el flujo compartido de "Guardar en Biblioteca" (narrativa,
 * alternativas, beneficios): guarda, y si el servidor detecta un ítem muy
 * similar ya guardado (mismo título/tipo/contenido), expone `duplicate` en
 * vez de bloquear — el llamador decide si confirma con `saveAnyway()`.
 */
function useSaveToLibrary() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [duplicate, setDuplicate] = useState<{ title: string } | null>(null);
  const pendingInput = useRef<SaveToLibraryInput | null>(null);

  async function save(input: SaveToLibraryInput) {
    if (status === "saving") return;
    setStatus("saving");
    const result = await saveLibraryItemAction(input);
    if (result.error) {
      setStatus("idle");
      return;
    }
    if (result.data?.duplicateOf) {
      pendingInput.current = input;
      setDuplicate({ title: result.data.duplicateOf.title });
      setStatus("idle");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  async function saveAnyway() {
    if (!pendingInput.current) return;
    const input = pendingInput.current;
    pendingInput.current = null;
    setDuplicate(null);
    setStatus("saving");
    const result = await saveLibraryItemAction({ ...input, force: true });
    setStatus(result.error ? "idle" : "saved");
    if (!result.error) setTimeout(() => setStatus("idle"), 1500);
  }

  function cancelDuplicate() {
    pendingInput.current = null;
    setDuplicate(null);
  }

  return { status, duplicate, save, saveAnyway, cancelDuplicate };
}

export { useSaveToLibrary };
