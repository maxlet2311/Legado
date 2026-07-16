"use client";

import { useState, useTransition } from "react";
import { FileDown, Loader2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PreviewActionsProps {
  versionId: string;
  hasPdf: boolean;
}

function PreviewActions({ versionId, hasPdf: initialHasPdf }: PreviewActionsProps) {
  const [hasPdf, setHasPdf] = useState(initialHasPdf);
  const [error, setError] = useState<string | undefined>();
  const [isGenerating, startGenerating] = useTransition();
  const [isDownloading, startDownloading] = useTransition();

  function handleGenerate() {
    setError(undefined);
    startGenerating(async () => {
      const response = await fetch(`/api/proposal-versions/${versionId}/pdf`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "No pudimos generar el PDF.");
        return;
      }
      setHasPdf(true);
    });
  }

  function handleDownload() {
    setError(undefined);
    startDownloading(async () => {
      const response = await fetch(`/api/proposal-versions/${versionId}/download`);
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "No pudimos descargar el PDF.");
        return;
      }
      window.location.href = body.url;
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        {!hasPdf ? (
          <Button type="button" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Generar PDF
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar PDF
          </Button>
        )}
      </div>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  );
}

export { PreviewActions };
