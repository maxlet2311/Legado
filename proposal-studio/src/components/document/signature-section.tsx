/**
 * Firma del asesor: solo se renderiza si el snapshot trae una signed URL ya
 * resuelta del lado servidor (`buildDocumentSnapshot`). Nunca recibe el path
 * privado directamente ni la persiste — ver 07_BRANDING_SYSTEM.md.
 */
function SignatureSection({ signatureUrl, advisorName }: { signatureUrl: string | null; advisorName: string | null }) {
  if (!signatureUrl) return null;

  return (
    <div style={{ marginTop: "8mm", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- HTML servido a Puppeteer. */}
      <img src={signatureUrl} alt={advisorName ?? "Firma"} style={{ maxHeight: "18mm", maxWidth: "60mm", objectFit: "contain" }} />
      <div style={{ width: "50mm", borderTop: "1px solid #9AA396", marginTop: "1mm", paddingTop: "1mm", fontSize: "8pt", color: "#5A6259" }}>
        {advisorName}
      </div>
    </div>
  );
}

export { SignatureSection };
