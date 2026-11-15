import { requireUser } from "@/lib/supabase/server";
import { joinGroup } from "../../actions";

export default async function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { user } = await requireUser();
  return (
    <form action={joinGroup.bind(null, code)} className="card mx-auto grid max-w-sm gap-3 p-6">
      <h1 className="text-xl font-semibold">Join group</h1>
      <label className="field"><span>Your name in this group</span><input name="display_name" defaultValue={user.user_metadata?.full_name ?? ""} /></label>
      <button className="btn">Join</button>
    </form>
  );
}
