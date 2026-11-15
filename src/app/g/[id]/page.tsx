import { SITE_URL } from "@/lib/supabase/config";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { balances, naira, settleUp } from "@/lib/settle";
import { addMember, deleteExpense, recordSettlement } from "../../actions";
import { ExpenseForm } from "./ExpenseForm";

type Exp = {
  id: string; paid_by: string; amount_kobo: number; description: string; is_settlement: boolean; created_at: string;
  expense_shares: { member_id: string; share_kobo: number }[];
};

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
  const total = list.filter((e) => !e.is_settlement).reduce((s, e) => s + Number(e.amount_kobo), 0);
  const site = SITE_URL;
  const meId = members.find((m) => m.user_id === user.id)?.id;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <p className="text-sm text-stone-500">Total spent {naira(total)} · Invite: <code className="rounded bg-stone-100 px-1">{site}/join/{group.invite_code}</code></p>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">Settle up</h2>
        {transfers.length === 0 ? (
          <p className="mt-2 text-sm text-emerald-700">Everyone is square 🎉</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {transfers.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span><b>{name.get(t.from)}</b> pays <b>{name.get(t.to)}</b> {naira(t.kobo)}</span>
                <form action={recordSettlement.bind(null, id, t.from, t.to, t.kobo)}>
                  <button className="btn-outline !py-1 text-xs">Mark paid</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {members.map((m) => {
            const v = bal.get(m.id) ?? 0;
            return (
              <span key={m.id} className={`badge ${v > 0 ? "!bg-emerald-100 !text-emerald-800" : v < 0 ? "!bg-red-100 !text-red-700" : ""}`}>
                {m.display_name}: {v > 0 ? "+" : ""}{naira(v)}
              </span>
            );
          })}
        </div>
      </section>

      <ExpenseForm groupId={id} members={members} meId={meId} />

      <form action={addMember.bind(null, id)} className="flex gap-2">
        <input name="display_name" placeholder="Add someone without an account" className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm" />
        <button className="btn-outline">Add</button>
      </form>

      <section className="card divide-y divide-stone-100">
        {list.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{e.is_settlement ? `💸 ${name.get(e.paid_by)} paid ${name.get(e.expense_shares[0]?.member_id)}` : e.description}</p>
              {!e.is_settlement && <p className="text-xs text-stone-500">Paid by {name.get(e.paid_by)} · split {e.expense_shares.length} ways</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{naira(Number(e.amount_kobo))}</span>
              <form action={deleteExpense.bind(null, id, e.id)}><button className="text-xs text-stone-400 hover:text-red-500">✕</button></form>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="p-4 text-sm text-stone-500">No expenses yet.</p>}
      </section>
    </div>
  );
}
