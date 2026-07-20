import type { ReactNode } from "react";

interface DocumentSectionProps {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  /** Sección protagonista: inicia página física propia en el PDF (Alternativas, Comparativa). */
  anchor?: boolean;
  /** Permite que el contenido fluya en varias páginas físicas (grillas largas, tablas). Por defecto evita partirse. */
  flow?: boolean;
}

/** Bloque de sección genérico: eyebrow + título editorial + contenido, con reglas anti-huérfano. */
function DocumentSection({ eyebrow, title, children, anchor = false, flow = false }: DocumentSectionProps) {
  const className = ["ps-section", anchor ? "ps-section--anchor" : "", flow ? "ps-section--flow" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      {eyebrow ? (
        <p
          style={{
            fontSize: "9pt",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ps-accent)",
            fontWeight: 700,
            margin: "0 0 3mm 0",
          }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className="ps-heading"
        style={{ fontSize: "18pt", margin: "0 0 6mm 0", color: "#1B211C", paddingBottom: "4mm", borderBottom: "1.5px solid #E5E1D3" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

export { DocumentSection };
