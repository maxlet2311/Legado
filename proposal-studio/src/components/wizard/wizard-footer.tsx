import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AutosaveIndicator } from "@/components/wizard/autosave-indicator";
import type { AutosaveStatus } from "@/types/wizard";

interface WizardFooterProps {
  onPrevious?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  autosaveStatus?: AutosaveStatus;
  autosaveError?: string;
  extra?: ReactNode;
}

function WizardFooter({
  onPrevious,
  onNext,
  nextLabel = "Siguiente",
  nextDisabled,
  nextLoading,
  autosaveStatus = "idle",
  autosaveError,
  extra,
}: WizardFooterProps) {
  return (
    <>
      <div className="flex items-center gap-4">
        <Button type="button" variant="secondary" onClick={onPrevious} disabled={!onPrevious}>
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </Button>
        <AutosaveIndicator status={autosaveStatus} error={autosaveError} />
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <Button type="button" onClick={onNext} disabled={nextDisabled || nextLoading}>
          {nextLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {nextLabel}
          {!nextLoading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

export { WizardFooter };
