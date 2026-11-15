/**
 * Money is handled in integer kobo (₦1 = 100 kobo) to avoid floating-point errors.
 */

export type Share = { memberId: string; kobo: number };
export type ExpenseLike = { paidBy: string; amount: number; shares: Share[] };
export type Transfer = { from: string; to: string; kobo: number };

/** Split an amount as evenly as possible; the first members absorb the leftover kobo. */
export function splitEvenly(totalKobo: number, memberIds: string[]): Share[] {
  if (!Number.isInteger(totalKobo) || totalKobo <= 0) throw new Error("Amount must be a positive whole number of kobo");
  if (memberIds.length === 0) throw new Error("Pick at least one person to split with");
  const base = Math.floor(totalKobo / memberIds.length);
  let rest = totalKobo - base * memberIds.length;
  return memberIds.map((memberId) => ({ memberId, kobo: base + (rest-- > 0 ? 1 : 0) }));
}

/** Net balance per member: positive = is owed money, negative = owes money. */
export function balances(memberIds: string[], expenses: ExpenseLike[]) {
  const bal = new Map(memberIds.map((id) => [id, 0]));
  for (const e of expenses) {
    bal.set(e.paidBy, (bal.get(e.paidBy) ?? 0) + e.amount);
    for (const s of e.shares) bal.set(s.memberId, (bal.get(s.memberId) ?? 0) - s.kobo);
  }
  return bal;
}

/**
 * Greedy settle-up: repeatedly match the biggest debtor with the biggest creditor.
 * Produces at most n-1 transfers, which is optimal or close to it for real-world groups.
 */
export function settleUp(bal: Map<string, number>): Transfer[] {
  const debtors = [...bal].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }));
  const creditors = [...bal].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }));
  debtors.sort((a, b) => b.v - a.v);
  creditors.sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const kobo = Math.min(debtors[i].v, creditors[j].v);
    if (kobo > 0) out.push({ from: debtors[i].id, to: creditors[j].id, kobo });
    debtors[i].v -= kobo;
    creditors[j].v -= kobo;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

export const naira = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);

export const toKobo = (nairaInput: string) => Math.round(Number(nairaInput.replace(/[,₦\s]/g, "")) * 100);
