import { ArrowRight, Banknote, CircleCheck, Download, Receipt, Scale, Trash2, UserPlus, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/kit/Avatar";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import { balances, naira, settleUp } from "@/lib/settle";
import { CopyButton } from "@/components/kit/CopyButton";
import { EmptyState, Stat } from "@/components/kit/Stat";
import { addMember, deleteExpense, recordSettlement } from "../../actions";
import { ExpenseForm } from "./ExpenseForm";
import { breakdown, category } from "@/lib/categories";

type Exp = {
  id: string; paid_by: string; amount_kobo: number; description: string; is_settlement: boolean; created_at: string; category: string | null;
  expense_shares: { member_id: string; share_kobo: number }[];
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: group }, { data: members }, { data: expenses }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", id).maybeSingle(),
    supabase.from("members").select("id, display_name, user_id").eq("group_id", id).order("display_name"),
    supabase.from("expenses").select("*, expense_shares(member_id, share_kobo)").eq("group_id", id).order("created_at", { ascending: false }),
  ]);
  if (!group || !members) notFound();

  const list = (expenses ?? []) as Exp[];
  const name = new Map(members.map((m) => [m.id, m.display_name]));
  const bal = balances(
    members.map((m) => m.id),
    list.map((e) => ({ paidBy: e.paid_by, amount: Number(e.amount_kobo), shares: e.expense_shares.map((s) => ({ memberId: s.member_id, kobo: Number(s.share_kobo) })) })),
  );
  const transfers = settleUp(bal);
  const spending = list.filter((e) => !e.is_settlement);
  const total = spending.reduce((s, e) => s + Number(e.amount_kobo), 0);
  const meId = members.find((m) => m.user_id === user.id)?.id;
  const myShare = spending.reduce((s, e) => s + Number(e.expense_shares.find((x) => x.member_id === meId)?.share_kobo ?? 0), 0);
  const myBal = meId ? (bal.get(meId) ?? 0) : 0;
  const invite = `${SITE_URL}/join/${group.invite_code}`;
  const maxAbs = Math.max(1, ...[...bal.values()].map(Math.abs));
  const paidBy = new Map<string, number>();
  for (const e of spending) paidBy.set(e.paid_by, (paidBy.get(e.paid_by) ?? 0) + Number(e.amount_kobo));
  const cats = breakdown(spending.map((e) => ({ category: e.category, amount: Number(e.amount_kobo) })));
  const byDay = new Map<string, Exp[]>();
  for (const e of list) byDay.set(day(e.created_at), [...(byDay.get(day(e.created_at)) ?? []), e]);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-stone-500 hover:text-accent">Your groups</Link>
          <h1 className="page-title mt-1">{group.name}</h1>
          <p className="mt-1 text-sm text-stone-500">{members.length} people · {spending.length} expenses</p>
        </div>
        <a href={`/g/${id}/export`} className="btn-outline"><Download size={15} aria-hidden /> Export CSV</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Receipt} label="Total spent" value={naira(total)} />
        <Stat icon={Wallet} label="Your share" value={naira(myShare)} hint={total ? `${Math.round((myShare / total) * 100)}% of the total` : undefined} />
        <Stat icon={Scale} label="Your balance" value={`${myBal > 0 ? "+" : ""}${naira(myBal)}`} hint={myBal > 0 ? "You are owed" : myBal < 0 ? "You owe" : "You are square"} />
        <Stat icon={Users} label="Top payer" value={paidBy.size ? (name.get([...paidBy].sort((a, b) => b[1] - a[1])[0][0]) ?? "–") : "–"} hint={paidBy.size ? naira([...paidBy.values()].sort((a, b) => b - a)[0]) : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="settle">
          <h2 id="settle" className="font-semibold">Settle up</h2>
          <p className="mt-1 text-sm text-stone-500">The fewest transfers that clear every debt.</p>
          {transfers.length === 0 ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CircleCheck size={16} aria-hidden /> Everyone is square
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {transfers.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 p-3 text-sm">
                  <span className="flex items-center gap-2">
                    <b>{name.get(t.from)}</b> <ArrowRight size={14} className="text-stone-400" aria-label="pays" /> <b>{name.get(t.to)}</b>
                    <span className="font-semibold text-accent">{naira(t.kobo)}</span>
                  </span>
                  <form action={recordSettlement.bind(null, id, t.from, t.to, t.kobo)}>
                    <button className="btn-outline !py-1.5 text-xs"><Banknote size={14} aria-hidden /> Mark paid</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6" aria-labelledby="balances">
          <h2 id="balances" className="mb-4 font-semibold">Balances</h2>
          <ul className="grid gap-3">
            {members.map((m) => {
              const v = bal.get(m.id) ?? 0;
              const w = `${(Math.abs(v) / maxAbs) * 50}%`;
              return (
                <li key={m.id} className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar userId={m.user_id} name={m.display_name} hasPhoto={Boolean(m.user_id)} size={26} tone={m.id === meId ? "accent" : "muted"} />
                    <span className="truncate">{m.display_name}{m.id === meId && <span className="text-stone-400"> (you)</span>}</span>
                  </span>
                  <span className="relative h-3 rounded-full bg-stone-100" aria-hidden>
                    <span className="absolute inset-y-0 left-1/2 w-px bg-stone-300" />
                    <span className={`absolute inset-y-0 rounded-full ${v >= 0 ? "left-1/2 bg-emerald-500" : "right-1/2 bg-red-400"}`} style={{ width: w }} />
                  </span>
                  <span className={`w-28 text-right font-medium tabular-nums ${v > 0 ? "text-emerald-700" : v < 0 ? "text-red-600" : "text-stone-500"}`}>
                    {v > 0 ? "+" : ""}{naira(v)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-stone-500">Green is owed money, red owes money.</p>
        </section>
      </div>

      {cats.length > 0 && (
        <section className="card grid gap-4 p-6" aria-labelledby="cats">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="cats" className="font-semibold">Where the money went</h2>
            <p className="text-sm text-stone-500">{naira(total)} across {cats.length} {cats.length === 1 ? "category" : "categories"}</p>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={cats.map((c) => `${c.label} ${c.pct}%`).join(", ")}>
            {cats.map((c) => <span key={c.id} style={{ width: `${c.pct}%`, background: c.color }} className="h-full border-r-2 border-white last:border-r-0" />)}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3 text-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: c.color }}><c.icon size={15} aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block font-medium">{c.label}</span>
                  <span className="block truncate text-xs text-stone-500 tabular-nums">{naira(c.kobo)} · {c.pct}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <ExpenseForm groupId={id} members={members} meId={meId} />
        <div className="grid h-fit gap-6">
          <section className="card grid gap-3 p-6" aria-labelledby="invite">
            <h2 id="invite" className="font-semibold">Invite friends</h2>
            <p className="break-all rounded-xl bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600">{invite}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={invite} label="Copy invite link" />
              <a className="btn-outline" href={`https://wa.me/?text=${encodeURIComponent(`Join "${group.name}" on NairaSplit: ${invite}`)}`} target="_blank" rel="noreferrer">
                Share on WhatsApp
              </a>
            </div>
          </section>
          <form action={addMember.bind(null, id)} className="card grid gap-3 p-6">
            <h2 className="font-semibold">Add someone without an account</h2>
            <div className="flex gap-2">
              <input name="display_name" required placeholder="Their name" className="input" aria-label="Name" />
              <button className="btn-outline shrink-0"><UserPlus size={15} aria-hidden /> Add</button>
            </div>
          </form>
        </div>
      </div>

      <section className="grid gap-4" aria-labelledby="history">
        <h2 id="history" className="text-lg font-semibold">History</h2>
        {list.length === 0 && <EmptyState icon={Receipt} title="No expenses yet" text="Add the first one above and balances will update for everyone." />}
        {[...byDay].map(([d, items]) => (
          <div key={d} className="grid gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{d}</h3>
            <div className="card divide-y divide-stone-100">
              {items.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="flex items-center gap-3">
                    {(() => {
                      if (e.is_settlement)
                        return <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Banknote size={16} aria-hidden /></span>;
                      const c = category(e.category);
                      return <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: c.color }} title={c.label}><c.icon size={16} aria-hidden /></span>;
                    })()}
                    <div>
                      <p className="font-medium">{e.is_settlement ? `${name.get(e.paid_by)} paid ${name.get(e.expense_shares[0]?.member_id)}` : e.description}</p>
                      {!e.is_settlement && <p className="text-xs text-stone-500">{category(e.category).label} · paid by {name.get(e.paid_by)} · split {e.expense_shares.length} ways</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">{naira(Number(e.amount_kobo))}</span>
                    <form action={deleteExpense.bind(null, id, e.id)}>
                      <button className="btn-ghost !p-2 hover:!bg-red-50 hover:!text-red-600" aria-label={`Delete ${e.description}`}><Trash2 size={15} aria-hidden /></button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
