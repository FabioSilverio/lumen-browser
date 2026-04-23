import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  Hammer,
  Leaf,
  PawPrint,
  ShoppingBasket,
  Sparkles,
  Shirt,
  UtensilsCrossed,
  LayoutGrid
} from "lucide-react";
import type { ChoreKind } from "../types";

export const CHORE_KIND_LABEL: Record<ChoreKind, string> = {
  limpeza: "Limpeza",
  cozinha: "Cozinha",
  compras: "Compras",
  roupa: "Roupa",
  manutencao: "Manutenção",
  plantas: "Plantas",
  pets: "Pets",
  organizacao: "Organização",
  outro: "Outro"
};

export const CHORE_ICON: Record<ChoreKind, LucideIcon> = {
  limpeza: Sparkles,
  cozinha: UtensilsCrossed,
  compras: ShoppingBasket,
  roupa: Shirt,
  manutencao: Hammer,
  plantas: Leaf,
  pets: PawPrint,
  organizacao: LayoutGrid,
  outro: Droplets
};

export const KIND_OPTIONS: ChoreKind[] = [
  "limpeza",
  "cozinha",
  "compras",
  "roupa",
  "manutencao",
  "plantas",
  "pets",
  "organizacao",
  "outro"
];

export function kindAccent(kind: ChoreKind): string {
  switch (kind) {
    case "limpeza":
      return "var(--accent-sky)";
    case "cozinha":
      return "var(--accent-amber)";
    case "compras":
      return "var(--accent-emerald)";
    case "roupa":
      return "var(--accent-violet)";
    case "manutencao":
      return "var(--accent-orange)";
    case "plantas":
      return "var(--accent-green)";
    case "pets":
      return "var(--accent-rose)";
    case "organizacao":
      return "var(--accent-cyan)";
    default:
      return "var(--accent-muted)";
  }
}
