"use client";

import { useEffect, useState } from "react";

/**
 * Estado booleano de UI persistido en localStorage (auditoría estructural,
 * Wave 1/2: sidebar colapsada, panel de Bloques y Vista previa del Wizard).
 * SSR-safe: siempre monta con `defaultValue` (evita mismatch de hidratación)
 * y recién después de montar lee el valor guardado, si existe. Nunca toca
 * backend/Supabase -- es exclusivamente preferencia de cliente.
 */
function usePersistentBoolean(key: string, defaultValue: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(stored === "1");
    } catch {
      // localStorage inaccesible (modo privado, storage lleno, etc.) -- se
      // sigue usando el default en memoria, sin persistencia.
    }
  }, [key]);

  function update(next: boolean) {
    setValue(next);
    try {
      window.localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // ver comentario arriba
    }
  }

  return [value, update];
}

export { usePersistentBoolean };
