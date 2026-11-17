"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { splitByPercent, splitEvenly, splitExact, toKobo } from "@/lib/settle";

const nameOf = (user: { email?: string; user_metadata?: { full_name?: string } }) =>
  user.user_metadata?.full_name || user.email?.split("@")[0] || "Me";

export async function createGroup(form: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(form.get("name") || "").trim();
  if (!name) return;
  const { data: g, error } = await supabase.from("groups").insert({ name }).select("id").single();
  if (error) throw error;
  await supabase.from("members").insert({ group_id: g.id, user_id: user.id, display_name: nameOf(user) });
  redirect(`/g/${g.id}`);
}

export async function addMember(groupId: string, form: FormData) {
  const { supabase } = await requireUser();
  const name = String(form.get("display_name") || "").trim();
  if (name) await supabase.from("members").insert({ group_id: groupId, display_name: name });
  revalidatePath(`/g/${groupId}`);
}

export async function addExpense(groupId: string, _prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const amount = toKobo(String(form.get("amount") || ""));
  const description = String(form.get("description") || "").trim();
  const paidBy = String(form.get("paid_by"));
  const among = form.getAll("among").map(String);
  const mode = String(form.get("mode") || "equal");
  if (!description) return { error: "What was it for?" };
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Enter an amount greater than zero." };
  let shares;
  try {
    if (mode === "exact") {
      shares = splitExact(amount, among.map((memberId) => ({ memberId, kobo: toKobo(String(form.get(`exact_${memberId}`) || "0")) })));
    } else if (mode === "percent") {
      shares = splitByPercent(amount, among.map((memberId) => ({ memberId, pct: Number(form.get(`pct_${memberId}`) || 0) })));
    } else {
      shares = splitEvenly(amount, among);
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { error } = await supabase.rpc("add_expense", {
    p_group: groupId,
    p_paid_by: paidBy,
    p_amount: amount,
    p_description: description,
    p_shares: shares,
  });
  if (error) return { error: error.message };
  revalidatePath(`/g/${groupId}`);
  return {};
}

/** Recording "A paid B ₦X" is an expense paid by A whose whole share belongs to B. */
export async function recordSettlement(groupId: string, from: string, to: string, kobo: number) {
  const { supabase } = await requireUser();
  await supabase.rpc("add_expense", {
    p_group: groupId,
    p_paid_by: from,
    p_amount: kobo,
    p_description: "Settlement",
    p_shares: [{ memberId: to, kobo }],
    p_settlement: true,
  });
  revalidatePath(`/g/${groupId}`);
}

export async function deleteExpense(groupId: string, id: string) {
  const { supabase } = await requireUser();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath(`/g/${groupId}`);
}

export async function joinGroup(code: string, form: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(form.get("display_name") || "").trim() || nameOf(user);
  const { data, error } = await supabase.rpc("join_group", { p_code: code, p_name: name });
  if (error) throw error;
  redirect(`/g/${data}`);
}
