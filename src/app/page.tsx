import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { createGroup } from "./actions";

export default async function Home() {
  const { supabase } = await requireUser();
  const { data: groups } = await supabase.from("groups").select("id, name, created_at").order("created_at", { ascending: false });
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Your groups</h1>
      <form action={createGroup} className="card flex gap-2 p-4">
        <input name="name" required placeholder="e.g. Hostel Block C, Lekki trip" className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm" />
        <button className="btn">Create group</button>
      </form>
      <div className="grid gap-3">
        {(groups ?? []).map((g) => (
          <Link key={g.id} href={`/g/${g.id}`} className="card p-4 font-medium hover:border-accent">{g.name}</Link>
        ))}
        {groups?.length === 0 && <p className="text-sm text-stone-500">No groups yet. Create one or open an invite link from a friend.</p>}
      </div>
    </div>
  );
}
