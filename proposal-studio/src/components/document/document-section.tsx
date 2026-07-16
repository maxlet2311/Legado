import type { ReactNode } from "react";

interface DocumentSectionProps {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}

/** Bloque de sección genérico: título + contenido, con reglas anti-huérfano. */
function DocumentSection({ eyebrow, title, children }: DocumentSectionProps) {
  return (
    <div className="ps-section">
      {eyebrow ? (
        <p style={{ fontSize: "9pt", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ps-accent)", margin: "0 0 3mm 0" }}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className="ps-heading" style={{ fontSize: "16pt", margin: "0 0 5mm 0", color: "#1F2421" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export { DocumentSection };
