"use client";

import { useEffect } from "react";

/**
 * Bloquea el cierre/recarga de la pestaña (diálogo nativo del navegador)
 * mientras `active` es true. Uso: cualquier guardado fire-and-forget que no
 * está atado al ciclo de vida del componente (ej. duplicar un ítem, que
 * persiste de inmediato) puede perder su resultado si el usuario recarga
 * antes de que la respuesta llegue -- este guard cierra esa ventana sin
 * tener que rediseñar el flujo de guardado.
 */
function useBeforeUnloadGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);
}

export { useBeforeUnloadGuard };
