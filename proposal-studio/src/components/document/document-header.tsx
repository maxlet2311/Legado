import type { DocumentSnapshot } from "@/lib/render/types";

/**
 * Header repetible del PDF (06_PDF_ENGINE.md § Header): logo + título +
 * cliente. Única fuente de verdad para el `headerTemplate` nativo de
 * Puppeteer (`src/lib/render/pdf.ts`) — antes existía una copia duplicada
 * como string HTML ahí, que podía divergir de este componente sin que nadie
 * lo notara. El template de header/footer de Puppeteer se renderiza en un
 * documento aislado (no comparte el `<style>` del documento principal), por
 * lo que este componente no puede depender de `var(--ps-...)`: recibe los
 * valores ya resueltos por props.
 */
function DocumentHeader({ snapshot, marginMm }: { snapshot: DocumentSnapshot; marginMm: number }) {
  const { proposal, client, brand } = snapshot;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "7.5px",
        color: "#5A6259",
        width: "100%",
        padding: `0 ${marginMm}mm`,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        {brand?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logo_url} alt="" style={{ height: "5mm", objectFit: "contain", flexShrink: 0 }} />
        ) : null}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proposal.title}</span>
      </span>
      <span style={{ flexShrink: 0, marginLeft: "8px" }}>{client?.full_name ?? ""}</span>
    </div>
  );
}

export { DocumentHeader };
