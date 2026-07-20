import { useState, type ReactNode } from "react";
import { Eye, Maximize2, Minimize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useFocusModeStore } from "@/stores/focus-mode-store";

interface WizardLayoutProps {
  outline: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  preview: ReactNode;
}

/**
 * El preview vive en un solo lugar del árbol (una sola instancia montada,
 * una sola cadena de fetch/debounce). En desktop se ve como panel lateral
 * (`lg:static`); en mobile/tablet se oculta por default y, al pedirlo, ese
 * mismo nodo pasa a ocupar un overlay de pantalla completa vía clases --
 * nunca se monta una segunda copia del componente.
 */
function WizardLayout({ outline, children, footer, preview }: WizardLayoutProps) {
  const focusMode = useFocusModeStore((state) => state.active);
  const toggleFocusMode = useFocusModeStore((state) => state.toggle);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <div className="flex items-center justify-end gap-2 border-b border-outline-variant bg-surface px-4 py-2 sm:px-8">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobilePreviewOpen(true)}
        >
          <Eye className="h-4 w-4" />
          Vista previa
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleFocusMode}
          title="Modo foco (F)"
        >
          {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {focusMode ? "Salir del modo foco" : "Modo foco"}
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-8 sm:px-8 lg:flex-row lg:items-start lg:gap-10 lg:overflow-visible">
        {!focusMode && outline}
        <div className="mx-auto w-full max-w-240">{children}</div>

        {!focusMode ? (
          <div
            className={cn(
              // El preview nunca comparte scroll con el editor: en desktop queda
              // fijo (`sticky`) con su propia altura acotada y scroll interno, así
              // desplazarse por un bloque largo del wizard nunca lo mueve ni se lo
              // lleva de la vista.
              "flex-col lg:flex lg:w-[420px] lg:shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] xl:w-[480px]",
              mobilePreviewOpen
                ? "fixed inset-0 z-50 flex bg-surface lg:static lg:inset-auto lg:z-auto lg:bg-transparent"
                : "hidden",
            )}
          >
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3 lg:hidden">
              <span className="text-small font-semibold text-on-surface">Vista previa</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setMobilePreviewOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden p-4 lg:p-0">{preview}</div>
          </div>
        ) : null}
      </div>
      <div className="sticky bottom-0 border-t border-outline-variant bg-surface px-4 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-240 items-center justify-between gap-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

export { WizardLayout };
