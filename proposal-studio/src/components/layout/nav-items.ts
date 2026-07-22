import { LayoutDashboard, FileText, BookOpen, Palette, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Panel de Control", icon: LayoutDashboard },
  { href: "/proposals", label: "Propuestas", icon: FileText },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/branding", label: "Mi Marca", icon: Palette },
];
