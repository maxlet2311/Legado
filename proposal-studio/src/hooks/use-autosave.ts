"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useBeforeUnloadGuard } from "@/hooks/use-before-unload-guard";
import type { AutosaveStatus } from "@/types/wizard";

const AUTOSAVE_DEBOUNCE_MS = 2000;

interface AutosaveResult {
  error?: string;
  /** true si el RPC devolvió SQLSTATE PS409 (revision no coincide con la fila actual). */
  conflict?: boolean;
  /** revision real en el servidor al momento del conflicto, para poder "conservar mi edición". */
  currentRevision?: number | null;
}

interface UseAutosaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  /** Si es true, no guarda automáticamente al cambiar `value`; solo vía `saveNow`/`forceSaveNow`. */
  manual?: boolean;
}

interface UseAutosaveResult<T> {
  status: AutosaveStatus;
  error: string | undefined;
  /** revision reportada por el servidor cuando hay conflicto; null si no aplica. */
  conflictRevision: number | null;
  saveNow: () => void;
  /**
   * Reintenta el guardado ignorando el estado de conflicto ("conservar mi
   * edición"). Acepta un valor explícito porque el caller normalmente acaba
   * de actualizar la revision local vía su propio setState/store, y ese
   * cambio todavía no se reflejó en el `value` que recibió este hook en el
   * render actual (closure stale) -- pasar `overrideValue` evita reintentar
   * con la revision vieja y volver a chocar contra el mismo conflicto.
   */
  forceSaveNow: (overrideValue?: T) => void;
  /** Limpia el estado de conflicto sin reintentar guardar (usado por "recargar cambios recientes", que ya trajo datos frescos). */
  clearConflict: () => void;
}

/**
 * Autoguarda `value` con debounce cuando cambia. Nunca bloquea la interfaz:
 * los errores quedan en `status`/`error` para que el caller los muestre.
 *
 * Concurrencia optimista: si `save` devuelve `{ conflict: true }` (RPC con
 * SQLSTATE PS409), el autosave se detiene para ese bloque -- no reintenta
 * solo, no sobrescribe -- hasta que el caller resuelva explícitamente vía
 * `forceSaveNow` (conservar mi edición, tras actualizar la revision local) o
 * `clearConflict` (recargar cambios recientes, tras traer datos frescos).
 *
 * Guardia de carrera: cada intento de guardado lleva un número de secuencia;
 * una respuesta que llega fuera de orden (más vieja que la última exitosa)
 * nunca sobreescribe el estado con datos desactualizados.
 */
function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<AutosaveResult | void>,
  { enabled = true, debounceMs = AUTOSAVE_DEBOUNCE_MS, manual = false }: UseAutosaveOptions = {},
): UseAutosaveResult<T> {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);

  const lastSavedRef = useRef<string>(JSON.stringify(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;

  const sequenceRef = useRef(0);
  const latestAppliedRef = useRef(0);
  const conflictedRef = useRef(false);
  /**
   * Payload serializado del guardado en vuelo, si hay uno. Evita que el
   * debounce automático y un click manual en "Guardar" (u otro disparo del
   * debounce) manden DOS requests concurrentes para el mismo contenido: el
   * segundo terminaba compitiendo por la misma `revision` esperada y
   * disparando un conflicto espurio, o simplemente dejaba el indicador
   * trabado en "Guardando" más de lo esperado. Un guardado nuevo solo tiene
   * sentido si el contenido cambió desde que se disparó el que está en vuelo.
   */
  const inFlightRef = useRef<string | null>(null);

  const runSave = useCallback(async (nextValue: T, serialized: string) => {
    const requestId = ++sequenceRef.current;
    inFlightRef.current = serialized;
    setStatus("saving");
    try {
      const result = await saveRef.current(nextValue);

      // Guardia de carrera: si mientras esperábamos esta respuesta ya se disparó
      // un guardado más nuevo (o el usuario resolvió un conflicto), esta
      // respuesta llegó tarde y no debe pisar el estado actual.
      if (requestId <= latestAppliedRef.current) return;
      latestAppliedRef.current = requestId;

      if (result?.conflict) {
        conflictedRef.current = true;
        setConflictRevision(result.currentRevision ?? null);
        setStatus("conflict");
        return;
      }

      if (result?.error) {
        setError(result.error);
        setStatus("error");
        return;
      }

      lastSavedRef.current = serialized;
      setError(undefined);
      setConflictRevision(null);
      conflictedRef.current = false;
      setStatus("saved");
    } catch {
      if (requestId <= latestAppliedRef.current) return;
      latestAppliedRef.current = requestId;
      setError("No pudimos guardar los cambios.");
      setStatus("error");
    } finally {
      if (inFlightRef.current === serialized) inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || manual || conflictedRef.current) return;

    const serialized = JSON.stringify(value);
    if (serialized === lastSavedRef.current || serialized === inFlightRef.current) return;

    // Hay un cambio local todavía no enviado: lo exponemos como "pending" (distinto
    // de "saving") para que el guard de beforeunload/pagehide pueda cubrir también
    // esta ventana -- de lo contrario un reload durante el debounce pierde el
    // cambio en silencio, sin ningún aviso al usuario.
    setStatus("pending");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSave(value, serialized);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, manual, debounceMs, runSave]);

  // Fire-and-forget a propósito: llamar directamente una server action con
  // `revalidatePath` desde un click handler y esperar esa promesa (en vez de
  // dejarla flotar) cuelga indefinidamente del lado del cliente -- confirmado
  // con tracing (el POST completa 200 en el servidor, pero la promesa nunca
  // resuelve en el browser). Por eso el wizard NO espera esto para navegar;
  // en cambio espera a que `status` salga de "pending"/"saving" por su cuenta
  // (ver proposal-wizard.tsx) antes de cambiar de paso.
  const saveNow = useCallback(() => {
    if (conflictedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const serialized = JSON.stringify(value);
    if (serialized === lastSavedRef.current || serialized === inFlightRef.current) return;
    void runSave(value, serialized);
  }, [value, runSave]);

  const forceSaveNow = useCallback(
    (overrideValue?: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      conflictedRef.current = false;
      const next = overrideValue ?? value;
      void runSave(next, JSON.stringify(next));
    },
    [value, runSave],
  );

  const clearConflict = useCallback(() => {
    conflictedRef.current = false;
    setConflictRevision(null);
    setError(undefined);
    setStatus("idle");
    lastSavedRef.current = JSON.stringify(value);
  }, [value]);

  // Cubre tanto el guardado en vuelo ("saving") como el cambio todavía no
  // enviado que espera el debounce ("pending") -- sin esto último, cerrar o
  // recargar la pestaña durante esa ventana pierde la edición en silencio.
  // El guardado en sí sigue en curso aunque el componente se desmonte de la
  // vista (cambiar de paso del wizard no cancela la promesa); lo único que sí
  // lo pierde es cerrar/recargar la pestaña mientras la respuesta está en vuelo.
  useBeforeUnloadGuard(status === "saving" || status === "pending");

  return { status, error, conflictRevision, saveNow, forceSaveNow, clearConflict };
}

export { useAutosave };
