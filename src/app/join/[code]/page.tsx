import { UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { joinGroup } from "../../actions";

export default async function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { user } = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);
  return (
    <form action={joinGroup.bind(null, code)} className="card mx-auto mt-8 grid w-full max-w-sm gap-4 p-8">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent"><UsersRound size={22} aria-hidden /></span>
      <div>
        <h1 className="text-xl font-semibold">You&apos;ve been invited</h1>
        <p className="mt-1 text-sm text-stone-500">Join the group to see shared expenses and balances.</p>
      </div>
      <label className="field"><span>Your name in this group</span><input name="display_name" defaultValue={user.user_metadata?.full_name ?? ""} /></label>
      <button className="btn">Join group</button>
    </form>
  );
}
