import { ArrowRight, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { balances, naira } from "@/lib/settle";
import { Landing } from "@/components/kit/Landing";
import { EmptyState } from "@/components/kit/Stat";
import { createGroup } from "./actions";

type G = {
  id: string; name: string; created_at: string;
  members: { id: string; user_id: string | null }[];
  expenses: { paid_by: string; amount_kobo: number; is_settlement: boolean; expense_shares: { member_id: string; share_kobo: number }[] }[];
};

export default async function Home() {
  const { supabase, user } = await getUser();
  if (!user) return <Landing />;
  const { data } = await supabase
    .from("groups")
    .select("id, name, created_at, members(id, user_id), expenses(paid_by, amount_kobo, is_settlement, expense_shares(member_id, share_kobo))")
    .order("created_at", { ascending: false });
  const groups = (data ?? []) as unknown as G[];
  const summary = groups.map((g) => {
    const me = g.members.find((m) => m.user_id === user.id)?.id;
    const bal = balances(g.members.map((m) => m.id), g.expenses.map((e) => ({ paidBy: e.paid_by, amount: Number(e.amount_kobo), shares: e.expense_shares.map((s) => ({ memberId: s.member_id, kobo: Number(s.share_kobo) })) })));
    const spent = g.expenses.filter((e) => !e.is_settlement).reduce((s, e) => s + Number(e.amount_kobo), 0);
    return { g, mine: me ? (bal.get(me) ?? 0) : 0, spent };
  });
  const owed = summary.reduce((s, x) => s + Math.max(0, x.mine), 0);
  const owe = summary.reduce((s, x) => s + Math.max(0, -x.mine), 0);

  return (
    <div className="grid gap-8">
      <div>
        <p className="eyebrow">Overview</p>
        <h1 className="page-title mt-1">Your groups</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-5"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">You are owed</p><p className="mt-1 text-2xl font-semibold text-emerald-700">{naira(owed)}</p></div>
        <div className="card p-5"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">You owe</p><p className="mt-1 text-2xl font-semibold text-red-600">{naira(owe)}</p></div>
      </div>
      <form action={createGroup} className="card flex flex-wrap gap-2 p-4">
        <label className="sr-only" htmlFor="group-name">Group name</label>
        <input id="group-name" name="name" required placeholder="e.g. Hostel Block C, Lekki trip" className="input min-w-[200px] flex-1" />
        <button className="btn"><Plus size={16} aria-hidden /> Create group</button>
      </form>
      {groups.length === 0 ? (
        <EmptyState icon={UsersRound} title="No groups yet" text="Create one above, or open an invite link from a friend." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {summary.map(({ g, mine, spent }) => (
            <Link key={g.id} href={`/g/${g.id}`} className="card flex items-center justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:border-accent">
              <div className="min-w-0">
                <p className="truncate font-semibold">{g.name}</p>
                <p className="text-sm text-stone-500">{g.members.length} people · {naira(spent)} spent</p>
                <p className={`mt-2 text-sm font-medium ${mine > 0 ? "text-emerald-700" : mine < 0 ? "text-red-600" : "text-stone-500"}`}>
                  {mine > 0 ? `You are owed ${naira(mine)}` : mine < 0 ? `You owe ${naira(-mine)}` : "Settled up"}
                </p>
              </div>
              <ArrowRight size={18} className="shrink-0 text-accent" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
