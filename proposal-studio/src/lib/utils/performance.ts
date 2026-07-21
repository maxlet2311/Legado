import "server-only";

/**
 * Instrumentación temporal de rendimiento (Fase 2 del audit de navegación).
 * Deliberadamente apagada salvo `PERFORMANCE_DEBUG=true`: nunca debe emitir
 * en producción por default, y nunca debe registrar tokens, cookies, datos
 * personales, contenido de propuestas ni emails — solo nombre, duración,
 * contexto y conteos numéricos.
 */
const ENABLED = process.env.PERFORMANCE_DEBUG === "true";

interface PerfMeta {
  /** Contexto libre: pathname, id de ruta, etc. Nunca un valor con PII. */
  context?: string;
  /** Cantidad de filas/resultados devueltos, cuando sea seguro reportarlo. */
  count?: number;
}

function emit(name: string, durationMs: number, meta?: PerfMeta) {
  if (!ENABLED) return;
  const entry = {
    tag: "[PERF]",
    name,
    durationMs: Math.round(durationMs * 100) / 100,
    context: meta?.context ?? null,
    count: meta?.count ?? null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    region: process.env.VERCEL_REGION ?? null,
    timestamp: new Date().toISOString(),
  };
  console.info(JSON.stringify(entry));
}

/**
 * Mide una operación async. Acepta `PromiseLike<T>` (no solo `Promise<T>`)
 * porque los query builders de Supabase son thenables, no instancias reales
 * de `Promise` — pasarlos directo evita un `await` extra innecesario.
 * Nunca lanza por su cuenta: si `fn` rechaza, la medición igual se emite
 * antes de repropagar.
 */
async function measurePerformance<T>(name: string, fn: () => PromiseLike<T>, meta?: PerfMeta): Promise<T> {
  if (!ENABLED) return fn();

  const start = performance.now();
  try {
    const result = await fn();
    emit(name, performance.now() - start, meta);
    return result;
  } catch (error) {
    emit(`${name}:error`, performance.now() - start, meta);
    throw error;
  }
}

export { measurePerformance };
