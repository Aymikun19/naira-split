import { category } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { csvResponse } from "@/lib/csv";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const [{ data: group }, { data: members }, { data: expenses }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).maybeSingle(),
    supabase.from("members").select("id, display_name").eq("group_id", id),
    supabase.from("expenses").select("created_at, description, category, amount_kobo, paid_by, is_settlement, expense_shares(member_id, share_kobo)").eq("group_id", id).order("created_at"),
  ]);
  if (!group) return new Response("Not found", { status: 404 });
  const name = new Map((members ?? []).map((m) => [m.id, m.display_name]));
  const rows = (expenses ?? []).map((e) => [
    e.created_at.slice(0, 10),
    e.is_settlement ? "Settlement" : e.description,
    e.is_settlement ? "" : category(e.category).label,
    (Number(e.amount_kobo) / 100).toFixed(2),
    name.get(e.paid_by),
    e.expense_shares.map((s) => `${name.get(s.member_id)}: ${(Number(s.share_kobo) / 100).toFixed(2)}`).join("; "),
  ]);
  const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "group";
  return csvResponse(`${slug}-expenses.csv`, [["Date", "Description", "Category", "Amount (NGN)", "Paid by", "Shares"], ...rows]);
}
