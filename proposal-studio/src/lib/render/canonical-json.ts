/**
 * Serializa un valor JSON con las claves de cada objeto ordenadas
 * recursivamente. Se usa para cualquier verificación o diff en el cliente
 * (ej. mostrar que dos versiones difieren); el checksum de la base de datos
 * (ver migración `emit_proposal_version`) es la fuente de verdad y se calcula
 * en Postgres sobre `content_json::text`, no con esta función.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return Object.fromEntries(entries.map(([key, val]) => [key, canonicalize(val)]));
  }
  return value;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export { canonicalize, canonicalStringify };
