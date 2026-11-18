import { ArrowLeftRight, ChartPie, FileDown, HandCoins, Link2, ReceiptText } from "lucide-react";

export const brand = {
  name: "NairaSplit",
  short: "Split shared bills in naira",
  eyebrow: "For roommates, trips and group projects",
  tagline: "Split bills with friends. Settle up in fewer transfers.",
  description:
    "Track who paid for what in your hostel, trip or group project. NairaSplit works out exactly who owes whom, with the smallest number of bank transfers possible.",
  cta: { href: "/login?mode=signup", label: "Start a group" },
  proof: ["Amounts in naira, to the kobo", "Invite friends by link", "Free"],
  features: [
    { icon: ReceiptText, title: "Log expenses in seconds", text: "Record what was bought, who paid and who shared it. Splits are exact to the kobo." },
    { icon: ArrowLeftRight, title: "Fewest transfers", text: "A settle-up plan that clears every debt with the minimum number of bank transfers." },
    { icon: HandCoins, title: "Record repayments", text: "Mark a transfer as paid and balances update for everyone in the group." },
    { icon: ChartPie, title: "Spending insights", text: "See total spent, each person's net balance and who has paid the most." },
    { icon: Link2, title: "Invite by link", text: "Share one link in your group chat and friends join with a tap." },
    { icon: FileDown, title: "Export to CSV", text: "Download every expense for your records or to settle a debate." },
  ],
  steps: [
    ["Create a group", "Name it after your flat, trip or project and share the invite link."],
    ["Add expenses", "Whoever pays logs it. Choose who shared the cost."],
    ["Settle up", "Follow the plan, record each transfer and watch the balances reach zero."],
  ] as [string, string][],
  closing: "Keep friendships and finances on good terms.",
  nav: [{ href: "/", label: "Groups" }] as { href: string; label: string; public?: boolean }[],
  width: "max-w-4xl",
  repo: "https://github.com/Aymikun19/naira-split",
  preview: "/preview.webp" as string | null,
};
