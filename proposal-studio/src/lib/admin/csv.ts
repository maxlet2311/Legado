import "server-only";

/** Escapa un valor para CSV (RFC 4180): comillas dobles si contiene coma, comilla o salto de línea. */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Genera CSV con timestamp de generación (UTC) en la primera línea como comentario — nunca incluye secretos, hashes ni tokens: eso es responsabilidad de quien arma las filas. */
function buildCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [
    `# Generado ${new Date().toISOString()} (UTC)`,
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  return lines.join("\r\n");
}

export { buildCsv };
