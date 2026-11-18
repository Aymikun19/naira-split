import { Bus, Gamepad2, House, Lightbulb, ShoppingBag, Tag, UtensilsCrossed, type LucideIcon } from "lucide-react";

export const CATEGORIES = [
  { id: "food", label: "Food", icon: UtensilsCrossed, color: "#ea580c" },
  { id: "transport", label: "Transport", icon: Bus, color: "#2563eb" },
  { id: "rent", label: "Rent", icon: House, color: "#7c3aed" },
  { id: "utilities", label: "Bills", icon: Lightbulb, color: "#ca8a04" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, color: "#db2777" },
  { id: "fun", label: "Fun", icon: Gamepad2, color: "#0d9488" },
  { id: "other", label: "Other", icon: Tag, color: "#78716c" },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon; color: string }[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const category = (id: string | null | undefined) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

/** Totals per category, largest first, with each share of the whole as a percentage. */
export function breakdown(items: { category?: string | null; amount: number }[]) {
  const sums = new Map<string, number>();
  for (const i of items) sums.set(category(i.category).id, (sums.get(category(i.category).id) ?? 0) + i.amount);
  const total = [...sums.values()].reduce((a, b) => a + b, 0);
  return [...sums]
    .map(([id, kobo]) => ({ ...category(id), kobo, pct: total ? Math.round((kobo / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.kobo - a.kobo);
}

/** Guess a category from the description so most people never touch the picker. */
export function guessCategory(desc: string): CategoryId {
  const d = desc.toLowerCase();
  if (/(suya|food|rice|lunch|dinner|breakfast|chicken|pizza|shawarma|drinks?|snack|grocer|amala|jollof|bole)/.test(d)) return "food";
  if (/(uber|bolt|taxi|bus|keke|okada|fuel|petrol|transport|ride|flight|train)/.test(d)) return "transport";
  if (/(rent|hostel|apartment|lodge|room)/.test(d)) return "rent";
  if (/(light|nepa|electric|water|wifi|internet|data|airtime|gas|dstv|gotv|bill)/.test(d)) return "utilities";
  if (/(movie|cinema|party|club|game|concert|ticket|outing)/.test(d)) return "fun";
  if (/(market|shop|clothes|shoe|buy|bag)/.test(d)) return "shopping";
  return "other";
}
