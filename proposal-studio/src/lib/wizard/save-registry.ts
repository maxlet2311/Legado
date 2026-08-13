/**
 * Registro de funciones `saveNow` para listas de ítems editables (Alternativas,
 * Beneficios). Cada ítem se registra/desregistra por su `client_key` al
 * montar/desmontar o cuando cambia su `saveNow` vigente; `flushAll` guarda
 * todos los ítems con ediciones pendientes de una sola vez.
 *
 * Existe como módulo separado (en vez de vivir inline en cada step) para que
 * el mecanismo que corrige la pérdida de datos al navegar sin guardar
 * manualmente (ver auditoría Wizard -> Preview) tenga cobertura de test sin
 * depender de un DOM real.
 */
function createSaveRegistry() {
  const saveFns = new Map<string, () => void>();

  function register(key: string, saveNow: (() => void) | null): void {
    if (saveNow) saveFns.set(key, saveNow);
    else saveFns.delete(key);
  }

  function flushAll(): void {
    for (const save of saveFns.values()) save();
  }

  function size(): number {
    return saveFns.size;
  }

  return { register, flushAll, size };
}

export { createSaveRegistry };
