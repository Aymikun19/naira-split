"use client";

import { useActionState } from "react";
import { addExpense } from "../../actions";

export function ExpenseForm({ groupId, members, meId }: { groupId: string; members: { id: string; display_name: string }[]; meId?: string }) {
  const [state, action, pending] = useActionState(addExpense.bind(null, groupId), {} as { error?: string });
  return (
    <form action={action} className="card grid gap-3 p-5">
      <h2 className="font-semibold">Add expense</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="field"><span>Description</span><input name="description" required placeholder="Suya and drinks" /></label>
        <label className="field"><span>Amount (₦)</span><input name="amount" inputMode="decimal" required placeholder="7,500" /></label>
      </div>
      <label className="field">
        <span>Paid by</span>
        <select name="paid_by" defaultValue={meId}>{members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}</select>
      </label>
      <fieldset className="text-sm">
        <legend className="mb-1 font-medium text-stone-600">Split equally between</legend>
        <div className="flex flex-wrap gap-3">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5"><input type="checkbox" name="among" value={m.id} defaultChecked /> {m.display_name}</label>
          ))}
        </div>
      </fieldset>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn justify-self-start" disabled={pending}>{pending ? "Adding…" : "Add expense"}</button>
    </form>
  );
}
