"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/wizard/section-card";
import { useProposalDetailsAutosave } from "@/hooks/use-proposal-details-autosave";
import { useWizardStore } from "@/stores/wizard-store";

const OBJECTIVE_LABELS: Record<string, string> = {
  protect_family: "Proteger a su familia",
  build_savings: "Construir ahorro",
  retirement: "Planificar el retiro",
  business_protection: "Proteger su empresa",
  partners_protection: "Proteger a los socios",
  employee_retention: "Fidelizar colaboradores",
  custom: "Estrategia personalizada",
};

function StepInfo() {
  const data = useWizardStore((state) => state.data);
  const setMeta = useWizardStore((state) => state.setMeta);

  const isValid = Boolean(data?.meta.title.trim() && data?.meta.product.trim());
  useProposalDetailsAutosave(isValid);

  if (!data) return null;

  return (
    <SectionCard title="Información de la propuesta" description="Datos generales del documento.">
      <div className="space-y-2">
        <Label htmlFor="title">
          Título <span className="text-error">*</span>
        </Label>
        <Input
          id="title"
          value={data.meta.title}
          onChange={(event) => setMeta({ title: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de propuesta</Label>
          <Select
            value={data.meta.proposal_type}
            onValueChange={(value) => setMeta({ proposal_type: value as typeof data.meta.proposal_type })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="corporate">Corporativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Objetivo principal</Label>
          <Select
            value={data.meta.primary_objective}
            onValueChange={(value) =>
              setMeta({ primary_objective: value as typeof data.meta.primary_objective })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OBJECTIVE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product">
            Producto <span className="text-error">*</span>
          </Label>
          <Input
            id="product"
            placeholder="Vida Integral Plus"
            value={data.meta.product}
            onChange={(event) => setMeta({ product: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Moneda</Label>
          <Select
            value={data.meta.currency}
            onValueChange={(value) => setMeta({ currency: value as typeof data.meta.currency })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ARS">ARS</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="internal_notes">Observaciones internas</Label>
        <Textarea
          id="internal_notes"
          rows={4}
          placeholder="Notas privadas, no visibles para el cliente."
          value={data.meta.internal_notes}
          onChange={(event) => setMeta({ internal_notes: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-small text-on-surface-variant">
        <div>
          <p className="font-semibold text-on-surface">Fecha</p>
          <p>{new Date(data.meta.created_at).toLocaleDateString("es-AR")}</p>
        </div>
        <div>
          <p className="font-semibold text-on-surface">N.º de propuesta</p>
          <p>{data.meta.proposal_number}</p>
        </div>
        <div>
          <p className="font-semibold text-on-surface">Asesor</p>
          <p>{data.advisorName}</p>
        </div>
      </div>
    </SectionCard>
  );
}

export { StepInfo };
