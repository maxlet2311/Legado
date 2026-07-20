import type { DocumentSnapshot } from "@/lib/render/types";
import { resolveTemplate } from "@/lib/render/template-registry";
import { DocumentShell } from "@/components/document/document-shell";
import { DocumentCover } from "@/components/document/document-cover";
import { ExecutiveSummarySection } from "@/components/document/executive-summary-section";
import { DiagnosisSection } from "@/components/document/diagnosis-section";
import { RecommendationSection } from "@/components/document/recommendation-section";
import { AlternativesSection } from "@/components/document/alternatives-section";
import { ComparisonSection } from "@/components/document/comparison-section";
import { BenefitsSection } from "@/components/document/benefits-section";
import { AdvisorSection } from "@/components/document/advisor-section";
import { SignatureSection } from "@/components/document/signature-section";

/**
 * Ensambla el árbol de componentes del documento a partir, exclusivamente,
 * del snapshot congelado (nunca de tablas vivas — 06_PDF_ENGINE.md § Render
 * Pipeline). Cada sección decide su propia visibilidad: si no hay contenido
 * real, no se renderiza ningún bloque vacío.
 *
 * El contenido (todo lo que no es portada) fluye de forma continua dentro de
 * un único `.ps-content`: solo las secciones protagonistas (Alternativas,
 * Comparativa) fuerzan el inicio de una página física nueva
 * (`DocumentSection anchor`); el resto se apila sin desperdiciar espacio en
 * páginas cortas — ver `document-shell.tsx`.
 */
interface RenderDocumentProps {
  snapshot: DocumentSnapshot;
  /**
   * El motor de PDF genera la portada y el contenido como dos PDFs separados
   * (la portada nunca lleva header/footer/numeración de Puppeteer) y los
   * combina — ver `src/lib/render/pdf.ts`. La vista previa en el navegador
   * usa "full" para mostrar el documento completo de una sola vez.
   */
  variant?: "full" | "cover" | "content";
}

function RenderDocument({ snapshot, variant = "full" }: RenderDocumentProps) {
  const template = resolveTemplate(snapshot.template);
  void template;

  const { proposal, narrative, alternatives, comparison, benefits, brand } = snapshot;
  const showCover = variant !== "content" && proposal.show_cover;
  const showContent = variant !== "cover";

  const hasDiagnosisOrStrategy =
    Boolean(narrative?.current_situation?.trim()) ||
    Boolean(narrative?.detected_needs?.trim()) ||
    Boolean(narrative?.detected_risks?.trim()) ||
    Boolean(narrative?.opportunities?.trim()) ||
    Boolean(narrative?.objectives?.trim()) ||
    Boolean(narrative?.recommended_strategy?.trim());

  return (
    <DocumentShell snapshot={snapshot}>
      {showCover ? <DocumentCover snapshot={snapshot} /> : null}

      {showContent ? (
        <div className="ps-content">
          {proposal.show_summary ? <ExecutiveSummarySection snapshot={snapshot} /> : null}

          {hasDiagnosisOrStrategy ? (
            <>
              <DiagnosisSection narrative={narrative} />
              <RecommendationSection narrative={narrative} />
            </>
          ) : null}

          {alternatives.length > 0 ? <AlternativesSection alternatives={alternatives} /> : null}

          {comparison.columns.length > 0 && comparison.rows.length > 0 ? (
            <ComparisonSection comparison={comparison} />
          ) : null}

          {benefits.length > 0 ? <BenefitsSection benefits={benefits} /> : null}

          <AdvisorSection narrative={narrative} brand={brand} />
          <SignatureSection signatureUrl={snapshot.resolvedSignatureUrl} advisorName={brand?.advisor_name ?? null} />

          {proposal.show_legal_note ? (
            <p className="ps-section" style={{ fontSize: "7.5pt", color: "#8A9086", lineHeight: 1.5 }}>
              Este documento es una propuesta de estrategia elaborada por {brand?.commercial_name ?? "el asesor"} en
              base a la información provista por el cliente. No constituye una oferta vinculante ni sustituye la
              documentación contractual del producto seleccionado.
            </p>
          ) : null}
        </div>
      ) : null}
    </DocumentShell>
  );
}

export { RenderDocument };
