"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { naira, toKobo } from "@/lib/settle";
import { addExpense } from "../../actions";

type Mode = "equal" | "exact" | "percent";

export function ExpenseForm({ groupId, members, meId }: { groupId: string; members: { id: string; display_name: string }[]; meId?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<Mode>("equal");
  const [amount, setAmount] = useState("");
  const [picked, setPicked] = useState<string[]>(members.map((m) => m.id));
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, action, pending] = useActionState<{ error?: string; ok?: number }, FormData>(async (p, f) => {
    const r = await addExpense(groupId, p, f);
    if (r.error) return r;
    ref.current?.reset();
    setAmount("");
    setValues({});
    return { ok: Date.now() };
  }, {});

  const total = toKobo(amount || "0");
  const each = picked.length ? Math.floor(total / picked.length) : 0;
  const entered = picked.reduce((s, id) => s + (mode === "exact" ? toKobo(values[id] || "0") : Number(values[id] || 0)), 0);
  const summary =
    mode === "equal"
      ? picked.length ? `${naira(each)} each` : "Pick at least one person"
      : mode === "exact"
        ? `${naira(entered)} of ${naira(total)} assigned`
        : `${entered}% of 100% assigned`;
  const balanced = mode === "equal" ? picked.length > 0 : mode === "exact" ? entered === total && total > 0 : Math.abs(entered - 100) < 0.001;

  return (
    <form ref={ref} action={action} className="card grid gap-4 p-6">
      <h2 className="font-semibold">Add an expense</h2>
      <input type="hidden" name="mode" value={mode} />
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <label className="field"><span>Description</span><input name="description" required placeholder="Suya and drinks" /></label>
        <label className="field"><span>Amount (₦)</span><input name="amount" inputMode="decimal" required placeholder="7,500" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      </div>
      <label className="field">
        <span>Paid by</span>
        <select name="paid_by" defaultValue={meId}>{members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}</select>
      </label>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium text-stone-700">How should it be split?</legend>
        <div role="radiogroup" className="grid grid-cols-3 rounded-xl bg-stone-100 p-1 text-sm font-medium">
          {(["equal", "exact", "percent"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
              className={`rounded-lg py-2 transition ${mode === m ? "bg-white shadow-sm" : "text-stone-500 hover:text-stone-800"}`}>
              {m === "equal" ? "Equally" : m === "exact" ? "Exact amounts" : "Percentages"}
            </button>
          ))}
        </div>
        <ul className="grid gap-2">
          {members.map((m) => {
            const on = picked.includes(m.id);
            return (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-stone-200 px-3 py-2">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input type="checkbox" name="among" value={m.id} checked={on} className="size-4 accent-[var(--accent)]"
                    onChange={() => setPicked((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))} />
                  {m.display_name}
                </label>
                {mode === "equal" && on && <span className="text-sm text-stone-500">{naira(each)}</span>}
                {mode !== "equal" && on && (
                  <input
                    name={`${mode === "exact" ? "exact" : "pct"}_${m.id}`}
                    inputMode="decimal"
                    aria-label={`${m.display_name}'s ${mode === "exact" ? "amount in naira" : "percentage"}`}
                    placeholder={mode === "exact" ? "₦0" : "0%"}
                    value={values[m.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                    className="input !w-28 !py-1.5 text-right"
                  />
                )}
              </li>
            );
          })}
        </ul>
        <p className={`text-sm ${balanced ? "text-stone-500" : "text-amber-700"}`} aria-live="polite">{summary}</p>
      </fieldset>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">Expense added.</p>}
      <button className="btn justify-self-start" disabled={pending}><Plus size={16} aria-hidden /> {pending ? "Adding…" : "Add expense"}</button>
    </form>
  );
}
