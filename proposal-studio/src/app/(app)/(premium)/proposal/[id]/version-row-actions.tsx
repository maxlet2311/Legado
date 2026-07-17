"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

function VersionRowActions({ versionId, hasPdf: initialHasPdf }: { versionId: string; hasPdf: boolean }) {
  const router = useRouter();
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
      router.refresh();
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
    <div className="flex items-center gap-2">
      {!hasPdf ? (
        <Button type="button" size="sm" variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Generar
        </Button>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Descargar
        </Button>
      )}
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}

export { VersionRowActions };
