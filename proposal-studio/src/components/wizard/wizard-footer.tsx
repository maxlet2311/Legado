import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
  onResolveKeepMine?: () => void;
  onResolveReload?: () => void;
  onSaveNow?: () => void;
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
  onResolveKeepMine,
  onResolveReload,
  onSaveNow,
  extra,
}: WizardFooterProps) {
  return (
    <>
      <div className="flex items-center gap-4">
        <Button type="button" variant="secondary" onClick={onPrevious} disabled={!onPrevious}>
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </Button>
        {onSaveNow && (
          <Button type="button" variant="secondary" onClick={onSaveNow}>
            Guardar
          </Button>
        )}
        <AutosaveIndicator
          status={autosaveStatus}
          error={autosaveError}
          onResolveKeepMine={onResolveKeepMine}
          onResolveReload={onResolveReload}
        />
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <Button type="button" onClick={onNext} disabled={nextDisabled || nextLoading}>
          {nextLoading && <Spinner className="h-4 w-4" />}
          {nextLabel}
          {!nextLoading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

export { WizardFooter };
