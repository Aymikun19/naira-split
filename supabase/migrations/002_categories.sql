-- Expense categories for a spending breakdown.
alter table nairasplit.expenses add column if not exists category text not null default 'other'
  check (category in ('food','transport','rent','utilities','shopping','fun','other'));

drop function if exists nairasplit.add_expense(uuid, uuid, bigint, text, jsonb, boolean);
create function nairasplit.add_expense(p_group uuid, p_paid_by uuid, p_amount bigint, p_description text,
                                       p_shares jsonb, p_settlement boolean default false, p_category text default 'other')
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  new_id uuid;
  total bigint;
begin
  select coalesce(sum((s->>'kobo')::bigint), 0) into total from jsonb_array_elements(p_shares) s;
  if total <> p_amount then raise exception 'Shares (%) must add up to the amount (%)', total, p_amount; end if;
  insert into nairasplit.expenses (group_id, paid_by, amount_kobo, description, is_settlement, category)
    values (p_group, p_paid_by, p_amount, p_description, p_settlement, coalesce(p_category, 'other')) returning id into new_id;
  insert into nairasplit.expense_shares (expense_id, member_id, share_kobo)
    select new_id, (s->>'memberId')::uuid, (s->>'kobo')::bigint from jsonb_array_elements(p_shares) s;
  return new_id;
end $$;
grant execute on function nairasplit.add_expense to authenticated;
