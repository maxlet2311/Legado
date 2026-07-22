import {
  Shield,
  Heart,
  Umbrella,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  Star,
  Home,
  Briefcase,
  Lock,
  Gift,
  Phone,
  PiggyBank,
  FileCheck,
  type LucideIcon,
} from "lucide-react";

import type { SnapshotBenefit } from "@/lib/render/types";
import { DocumentSection } from "@/components/document/document-section";

/**
 * Iconografía consistente (brief § 6 "Beneficios" — sin emojis, Lucide).
 * `benefit.icon` es texto libre cargado por el asesor; se mapea a un ícono
 * conocido cuando coincide y cae a un ícono neutro cuando no — nunca se
 * inventa contenido, solo se resuelve la representación visual.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  shield: Shield,
  protection: Shield,
  heart: Heart,
  family: Heart,
  umbrella: Umbrella,
  savings: PiggyBank,
  "piggy-bank": PiggyBank,
  growth: TrendingUp,
  "trending-up": TrendingUp,
  money: DollarSign,
  "dollar-sign": DollarSign,
  retirement: PiggyBank,
  team: Users,
  users: Users,
  time: Clock,
  clock: Clock,
  check: CheckCircle2,
  "check-circle": CheckCircle2,
  star: Star,
  home: Home,
  house: Home,
  business: Briefcase,
  briefcase: Briefcase,
  security: Lock,
  lock: Lock,
  gift: Gift,
  benefit: Gift,
  phone: Phone,
  contact: Phone,
  document: FileCheck,
  tax: FileCheck,
};

function resolveIcon(icon: string): LucideIcon {
  return ICON_MAP[icon.trim().toLowerCase()] ?? CheckCircle2;
}

function BenefitCard({ benefit }: { benefit: SnapshotBenefit }) {
  const Icon = resolveIcon(benefit.icon);
  return (
    <div className="ps-card" style={{ border: "1px solid #DEDCCF", borderRadius: "8px", padding: "5mm" }}>
      <div
        style={{
          width: "9mm",
          height: "9mm",
          borderRadius: "50%",
          background: "color-mix(in srgb, var(--ps-accent) 14%, white)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "3mm",
        }}
      >
        <Icon size={14} color="var(--ps-accent)" strokeWidth={2} />
      </div>
      <h3 style={{ fontSize: "10.5pt", margin: "0 0 1.5mm 0", fontFamily: "var(--ps-font-display)" }}>{benefit.title}</h3>
      <p style={{ fontSize: "9pt", lineHeight: 1.45, margin: 0, color: "#3A413C" }}>{benefit.description}</p>
    </div>
  );
}

/** Beneficios (06_PDF_ENGINE.md § Beneficios): Cards breves, sin párrafos largos. */
function BenefitsSection({ benefits }: { benefits: SnapshotBenefit[] }) {
  if (benefits.length === 0) return null;
  const sorted = [...benefits].sort((a, b) => a.display_order - b.display_order);

  const [soloBenefit] = sorted;
  if (sorted.length === 1 && soloBenefit) {
    // Un solo beneficio: se cae del grid (que lo estiraría a `1fr` = 100%
    // del ancho) y se cap+alinea como card suelta, igual que Alternativas.
    return (
      <DocumentSection eyebrow="Lo que incluye" title="Beneficios" flow>
        <div style={{ maxWidth: "min(var(--ps-card-max), 100%)" }}>
          <BenefitCard benefit={soloBenefit} />
        </div>
      </DocumentSection>
    );
  }

  const columns = sorted.length <= 4 ? 2 : 3;

  return (
    <DocumentSection eyebrow="Lo que incluye" title="Beneficios" flow>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "5mm" }}>
        {sorted.map((benefit) => (
          <BenefitCard key={benefit.id} benefit={benefit} />
        ))}
      </div>
    </DocumentSection>
  );
}

export { BenefitsSection };
