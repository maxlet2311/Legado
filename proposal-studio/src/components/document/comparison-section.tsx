import type { SnapshotComparison } from "@/lib/render/types";
import { DocumentSection } from "@/components/document/document-section";

/**
 * Comparativa (06_PDF_ENGINE.md § Comparativa): una única pregunta, legible
 * en segundos. `thead` repite en cada página física (tablas de varias
 * columnas / filas); cada fila evita partirse (`break-inside: avoid`, ver
 * DocumentShell).
 */
function ComparisonSection({ comparison }: { comparison: SnapshotComparison }) {
  if (comparison.columns.length === 0 || comparison.rows.length === 0) return null;

  return (
    <DocumentSection eyebrow="¿Cuál se adapta mejor?" title="Comparativa" anchor flow>
      <table className="ps-table" style={{ fontSize: "9pt" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "3mm 2mm", background: "var(--ps-primary)", color: "var(--ps-text-on-primary)", borderRadius: "6px 0 0 0" }} />
            {comparison.columns.map((column, index) => (
              <th
                key={column.id}
                style={{
                  textAlign: "left",
                  padding: "3mm 2mm",
                  background: "var(--ps-primary)",
                  color: "var(--ps-text-on-primary)",
                  fontWeight: 600,
                  borderRadius: index === comparison.columns.length - 1 ? "0 6px 0 0" : undefined,
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row, index) => (
            <tr key={row.id} style={{ background: index % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--ps-primary) 5%, white)" }}>
              <td style={{ padding: "2.5mm 2mm", fontWeight: 600, borderBottom: "1px solid #E5E1D3" }}>{row.label}</td>
              {comparison.columns.map((column) => (
                <td key={column.id} style={{ padding: "2.5mm 2mm", borderBottom: "1px solid #E5E1D3" }}>
                  {row.values[column.id] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </DocumentSection>
  );
}

export { ComparisonSection };
