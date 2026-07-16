"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  { enabled = true, debounceMs = AUTOSAVE_DEBOUNCE_MS }: UseAutosaveOptions = {},
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

  const runSave = useCallback(async (nextValue: T, serialized: string) => {
    const requestId = ++sequenceRef.current;
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
    }
  }, []);

  useEffect(() => {
    if (!enabled || conflictedRef.current) return;

    const serialized = JSON.stringify(value);
    if (serialized === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSave(value, serialized);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, debounceMs, runSave]);

  const saveNow = useCallback(() => {
    if (conflictedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const serialized = JSON.stringify(value);
    if (serialized === lastSavedRef.current) return;
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

  return { status, error, conflictRevision, saveNow, forceSaveNow, clearConflict };
}

export { useAutosave };
