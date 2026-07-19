/**
 * Diff simple y legible entre `before_data`/`after_data` de un evento de
 * auditoría — no es un diff genérico de JSON (sin diff profundo de arrays,
 * sin librería externa): compara solo el primer nivel de claves y reporta
 * agregadas/eliminadas/modificadas. Suficiente para lo que hoy escribe
 * `recordAdminAuditEvent` (objetos planos chicos, ej. `{ status: "..." }`).
 * Pensado para recibir valores ya sanitizados (`sanitizeForDisplay`).
 */

type DiffKind = "added" | "removed" | "modified";

interface DiffEntry {
  key: string;
  kind: DiffKind;
  before?: unknown;
  after?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function buildAuditDiff(before: unknown, after: unknown): DiffEntry[] {
  const beforeObj = asRecord(before);
  const afterObj = asRecord(after);
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  const entries: DiffEntry[] = [];
  for (const key of keys) {
    const hasBefore = Object.prototype.hasOwnProperty.call(beforeObj, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(afterObj, key);

    if (hasBefore && !hasAfter) {
      entries.push({ key, kind: "removed", before: beforeObj[key] });
    } else if (!hasBefore && hasAfter) {
      entries.push({ key, kind: "added", after: afterObj[key] });
    } else if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) {
      entries.push({ key, kind: "modified", before: beforeObj[key], after: afterObj[key] });
    }
  }

  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

export { buildAuditDiff };
export type { DiffEntry, DiffKind };
