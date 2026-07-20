import {
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  Gift,
  Heart,
  Home,
  Lock,
  type LucideIcon,
  Phone,
  PiggyBank,
  Shield,
  Star,
  TrendingUp,
  Umbrella,
  Users,
} from "lucide-react";

import type { BenefitCategory } from "@/types/wizard";

/**
 * Mismo vocabulario que `ICON_MAP` en
 * `src/components/document/benefits-section.tsx` (el motor de PDF, que no
 * se toca en este sprint) -- así lo que el asesor elige acá es exactamente
 * lo que va a ver en el documento final, cerrando el hueco que señaló la
 * auditoría del editor ("un error de tipeo no se detecta hasta ver el PDF").
 * Los alias (protection/family/savings/etc.) existen del lado del motor de
 * PDF para tolerar valores históricos; el selector solo ofrece la clave
 * canónica de cada ícono.
 */
export const BENEFIT_ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  heart: Heart,
  umbrella: Umbrella,
  "piggy-bank": PiggyBank,
  "trending-up": TrendingUp,
  "dollar-sign": DollarSign,
  users: Users,
  clock: Clock,
  "check-circle": CheckCircle2,
  star: Star,
  home: Home,
  briefcase: Briefcase,
  lock: Lock,
  gift: Gift,
  phone: Phone,
  document: FileCheck,
};

export const BENEFIT_ICONS_BY_CATEGORY: Record<BenefitCategory, string[]> = {
  family: ["heart", "umbrella", "users", "home"],
  retirement: ["piggy-bank", "trending-up", "clock", "dollar-sign"],
  tax: ["document", "dollar-sign", "check-circle"],
  business: ["briefcase", "trending-up", "users", "star"],
  legal: ["shield", "lock", "document", "check-circle"],
  financial: ["dollar-sign", "piggy-bank", "trending-up", "briefcase"],
  health: ["heart", "shield", "check-circle", "umbrella"],
  succession: ["gift", "star", "document", "home"],
};

export function getBenefitIcon(name: string): LucideIcon | undefined {
  return BENEFIT_ICONS[name];
}
