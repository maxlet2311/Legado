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
 * una sola cadena de fetch/debounce). Recién a partir de 2xl (1536px) se ve
 * como panel lateral fijo (`2xl:static`) -- por debajo de eso el editor no
 * tiene ancho de sobra para una tercera columna (ver comentario más abajo),
 * así que se oculta por default y, al pedirlo, ese mismo nodo pasa a ocupar
 * un overlay de pantalla completa vía clases -- nunca se monta una segunda
 * copia del componente.
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
          className="2xl:hidden"
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
      {!focusMode && (
        <div className="border-b border-outline-variant bg-surface px-4 py-4 sm:px-8">{outline}</div>
      )}
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-8 sm:px-8 lg:flex-row lg:items-start lg:gap-10 lg:overflow-visible">
        <div className="mx-auto w-full min-w-0 max-w-240 flex-1">{children}</div>

        {!focusMode ? (
          <div
            className={cn(
              // El preview nunca comparte scroll con el editor: en desktop queda
              // fijo (`sticky`) con su propia altura acotada y scroll interno, así
              // desplazarse por un bloque largo del wizard nunca lo mueve ni se lo
              // lleva de la vista.
              // Recién a partir de 2xl hay ancho real de sobra para sumar una
              // tercera columna sin apretar el editor (auditoría UX/UI, hallazgo
              // P1: a 1440px el editor quedaba comprimido a ~200px de ancho con
              // texto truncado en todos los campos porque nav + preview fijos no
              // dejaban lugar). Por debajo de 2xl, el preview se accede con el
              // mismo botón/overlay que ya existía para mobile/tablet.
              "flex-col 2xl:flex 2xl:w-[420px] 2xl:shrink-0 2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-7rem)]",
              mobilePreviewOpen
                ? "fixed inset-0 z-50 flex bg-surface 2xl:static 2xl:inset-auto 2xl:z-auto 2xl:bg-transparent"
                : "hidden",
            )}
          >
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3 2xl:hidden">
              <span className="text-small font-semibold text-on-surface">Vista previa</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobilePreviewOpen(false)}
                aria-label="Cerrar vista previa"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden p-4 2xl:p-0">{preview}</div>
          </div>
        ) : null}
      </div>
      <div className="sticky bottom-0 border-t border-outline-variant bg-surface px-4 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-240 flex-wrap items-center justify-between gap-3">
          {footer}
        </div>
      </div>
    </div>
  );
}

export { WizardLayout };
