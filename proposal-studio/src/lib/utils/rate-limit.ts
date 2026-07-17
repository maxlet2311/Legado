import "server-only";

/**
 * Interfaz desacoplada del almacenamiento real del rate limit (Etapa 4,
 * sección 25): permite reemplazar `InMemoryRateLimitStore` por un store
 * compartido entre instancias (ej. Upstash Redis/Ratelimit) sin tocar
 * ningún llamador de `checkRateLimit` — solo la instancia que se le pasa acá
 * abajo. No se conecta un servicio externo en esta etapa sin autorización
 * explícita; queda documentado como la implementación recomendada para
 * producción serverless multi-instancia.
 */
interface RateLimitStore {
  /** `true` si la operación está permitida (y consume una unidad); `false` si ya se alcanzó el límite. */
  consume(key: string, limit: number, windowMs: number): boolean;
}

/**
 * Best-effort en memoria. Suficiente para un solo proceso/servidor de larga
 * duración, pero NO ofrece protección real en despliegues serverless
 * multi-instancia (cada invocación puede caer en una instancia distinta con
 * su propio Map). Deuda técnica documentada desde la Etapa 2: reemplazar por
 * un `RateLimitStore` compartido antes de exponer estos endpoints a tráfico
 * público a escala (checkout, webhook, request-activation, sync admin, etc.
 * ya están todos protegidos con esta misma instancia — swap centralizado).
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  consume(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count += 1;
    return true;
  }
}

const defaultStore: RateLimitStore = new InMemoryRateLimitStore();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  return defaultStore.consume(key, limit, windowMs);
}

export { checkRateLimit };
export type { RateLimitStore };
