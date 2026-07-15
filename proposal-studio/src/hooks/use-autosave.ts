"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AutosaveStatus } from "@/types/wizard";

const AUTOSAVE_DEBOUNCE_MS = 2000;

interface UseAutosaveOptions {
  enabled?: boolean;
  debounceMs?: number;
}

interface UseAutosaveResult {
  status: AutosaveStatus;
  error: string | undefined;
  saveNow: () => void;
}

/**
 * Autoguarda `value` con debounce cuando cambia. Nunca bloquea la interfaz:
 * los errores quedan en `status`/`error` para que el caller los muestre.
 */
function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<{ error?: string } | void>,
  { enabled = true, debounceMs = AUTOSAVE_DEBOUNCE_MS }: UseAutosaveOptions = {},
): UseAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | undefined>();

  const lastSavedRef = useRef<string>(JSON.stringify(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;

  const runSave = useCallback(async (nextValue: T, serialized: string) => {
    setStatus("saving");
    try {
      const result = await saveRef.current(nextValue);
      if (result?.error) {
        setError(result.error);
        setStatus("error");
        return;
      }
      lastSavedRef.current = serialized;
      setError(undefined);
      setStatus("saved");
    } catch {
      setError("No pudimos guardar los cambios.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

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
    if (timerRef.current) clearTimeout(timerRef.current);
    const serialized = JSON.stringify(value);
    if (serialized === lastSavedRef.current) return;
    void runSave(value, serialized);
  }, [value, runSave]);

  return { status, error, saveNow };
}

export { useAutosave };
