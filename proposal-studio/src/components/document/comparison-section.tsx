import type { SnapshotComparison } from "@/lib/render/types";
import { DocumentSection } from "@/components/document/document-section";

/**
 * Detecta si un valor de celda es inequívocamente un porcentaje ("55%",
 * "7.5 %") para poder acompañarlo de una barra inline (Stitch North Star,
 * "Comparativa de Opciones"). Deliberadamente estricto: no interpreta texto
 * libre ("Moderada", "3 a 5 años") como dato numérico, así que la mayoría de
 * las filas queda como texto plano sin inventar semántica.
 */
function parsePercent(value: string): number | null {
  const match = /^\s*(\d{1,3}(?:\.\d+)?)\s*%\s*$/.exec(value);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1] as string);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : null;
}

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
      {/* Una única tabla comparativa: se muestra como card acotada (no un
          bloque de ancho completo) — mismo criterio que Alternativas/
          Beneficios. `overflow: hidden` reemplaza el border-radius manual
          que tenían las celdas del header, ahora recortado por el borde
          redondeado de la card. */}
      <div
        className="ps-card"
        style={{
          maxWidth: "min(var(--ps-card-max), 100%)",
          border: "1px solid #DEDCCF",
          borderRadius: "8px",
          overflow: "hidden",
          background: "#FFFFFF",
        }}
      >
        <table className="ps-table" style={{ fontSize: "9pt" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "3mm 2mm",
                  background: "var(--ps-primary)",
                  color: "var(--ps-text-on-primary)",
                  fontSize: "7.5pt",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Criterios de evaluación
              </th>
              {comparison.columns.map((column) => (
                <th
                  key={column.id}
                  style={{
                    textAlign: "left",
                    padding: "3mm 2mm",
                    background: column.recommended ? "var(--ps-secondary)" : "var(--ps-primary)",
                    color: "#FFFFFF",
                  }}
                >
                  {column.recommended && (
                    <div
                      style={{
                        fontSize: "6.5pt",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        marginBottom: "1mm",
                        opacity: 0.9,
                      }}
                    >
                      ★ Opción recomendada
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--ps-font-display)", fontSize: "10.5pt", fontWeight: 600 }}>
                    {column.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row, index) => (
              <tr key={row.id} style={{ background: index % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--ps-primary) 5%, white)" }}>
                <td style={{ padding: "2.5mm 2mm", fontWeight: 600, borderBottom: "1px solid #E5E1D3" }}>{row.label}</td>
                {comparison.columns.map((column) => {
                  const rawValue = row.values[column.id] ?? "";
                  const percent = parsePercent(rawValue);
                  return (
                    <td
                      key={column.id}
                      style={{
                        padding: "2.5mm 2mm",
                        borderBottom: "1px solid #E5E1D3",
                        background: column.recommended ? "color-mix(in srgb, var(--ps-secondary) 8%, transparent)" : undefined,
                        fontWeight: column.recommended ? 600 : 400,
                        color: column.recommended ? "var(--ps-secondary)" : undefined,
                      }}
                    >
                      {percent === null ? (
                        rawValue
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
                          <div
                            style={{
                              flex: 1,
                              height: "1.6mm",
                              borderRadius: "999px",
                              background: "#E5E1D3",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${percent}%`,
                                height: "100%",
                                background: column.recommended ? "var(--ps-secondary)" : "var(--ps-primary)",
                                borderRadius: "999px",
                              }}
                            />
                          </div>
                          <span style={{ whiteSpace: "nowrap" }}>{rawValue.trim()}</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DocumentSection>
  );
}

export { ComparisonSection };
