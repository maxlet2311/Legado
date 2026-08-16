import { useEffect, useRef, type ReactNode } from "react";
import { Blocks, Eye, Maximize2, Minimize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useFocusModeStore } from "@/stores/focus-mode-store";
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean";

interface WizardLayoutProps {
  outline: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  preview: ReactNode;
  /** Paso actual del wizard (0-based) -- solo para el auto-cierre de Preview en Comparativa. */
  currentStep?: number;
  /** Auditoría estructural, Wave 4: el paso Comparativa protege su propio ancho. */
  isComparisonStep?: boolean;
}

/**
 * El preview vive en un solo lugar del árbol (una sola instancia montada,
 * una sola cadena de fetch/debounce). "Bloques" y "Vista previa" son
 * paneles auxiliares ocultables de forma independiente (auditoría
 * estructural, Wave 2) -- el editor es la superficie principal y nunca se
 * comprime para dejarles lugar de forma forzada: por debajo de 2xl ambos se
 * acceden vía overlay/drawer; desde 2xl la Preview puede convivir como
 * columna lateral, pero solo si el usuario la dejó abierta.
 */
function WizardLayout({ outline, children, footer, preview, currentStep, isComparisonStep }: WizardLayoutProps) {
  const focusMode = useFocusModeStore((state) => state.active);
  const toggleFocusMode = useFocusModeStore((state) => state.toggle);
  const [blocksOpen, setBlocksOpen] = usePersistentBoolean("ps:wizard-blocks-open", true);
  const [previewOpen, setPreviewOpen] = usePersistentBoolean("ps:wizard-preview-open", false);

  // Al entrar a Comparativa, la tabla necesita todo el ancho disponible: se
  // cierra la Preview automáticamente (el usuario puede reabrirla a mano si
  // igual la quiere). No es Modo Foco -- sidebar/Bloques siguen disponibles.
  const lastAutoClosedStep = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (isComparisonStep && lastAutoClosedStep.current !== currentStep) {
      lastAutoClosedStep.current = currentStep;
      setPreviewOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComparisonStep, currentStep]);

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <div className="flex items-center justify-end gap-2 border-b border-outline-variant bg-surface px-4 py-2 sm:px-8">
        <Button
          type="button"
          variant={blocksOpen ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setBlocksOpen(!blocksOpen)}
          aria-expanded={blocksOpen}
          aria-controls="wizard-blocks-panel"
        >
          <Blocks className="h-4 w-4" />
          Bloques
        </Button>
        <Button
          type="button"
          variant={previewOpen ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setPreviewOpen(!previewOpen)}
          aria-expanded={previewOpen}
          aria-controls="wizard-preview-panel"
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
      {!focusMode && blocksOpen && (
        <div id="wizard-blocks-panel" className="border-b border-outline-variant bg-surface px-4 py-4 sm:px-8">
          {outline}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-8 sm:px-8 lg:flex-row lg:items-start lg:gap-10 lg:overflow-visible">
        <div className="mx-auto w-full min-w-0 max-w-240 flex-1">{children}</div>

        {!focusMode ? (
          <div
            id="wizard-preview-panel"
            className={cn(
              // El preview nunca comparte scroll con el editor: en desktop queda
              // fijo (`sticky`) con su propia altura acotada y scroll interno, así
              // desplazarse por un bloque largo del wizard nunca lo mueve ni se lo
              // lleva de la vista.
              // Recién a partir de 2xl hay ancho real de sobra para sumar una
              // tercera columna sin apretar el editor -- pero incluso ahí, solo si
              // `previewOpen`: nunca se fuerza visible (auditoría estructural,
              // hallazgo P0). Por debajo de 2xl, la Preview se abre como overlay
              // de pantalla completa.
              "flex-col",
              previewOpen && "2xl:flex 2xl:w-[420px] 2xl:shrink-0 2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-7rem)]",
              previewOpen
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
                onClick={() => setPreviewOpen(false)}
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
