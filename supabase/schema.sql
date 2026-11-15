-- Everything lives in the "nairasplit" schema so this app can share a Supabase project with others.
-- After running, add "nairasplit" under Supabase → Project Settings → Data API → Exposed schemas.
create schema if not exists nairasplit;
grant usage on schema nairasplit to anon, authenticated, service_role;
alter default privileges in schema nairasplit grant all on tables to anon, authenticated, service_role;
alter default privileges in schema nairasplit grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema nairasplit grant execute on functions to anon, authenticated, service_role;

-- NairaSplit schema. Money is stored as integer kobo.

create table nairasplit.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users default auth.uid(),
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table nairasplit.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references nairasplit.groups on delete cascade,
  user_id uuid references auth.users,           -- null for people without an account
  display_name text not null,
  unique (group_id, user_id)
);

create table nairasplit.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references nairasplit.groups on delete cascade,
  paid_by uuid not null references nairasplit.members on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  description text not null,
  is_settlement boolean not null default false,
  created_at timestamptz not null default now()
);

create table nairasplit.expense_shares (
  expense_id uuid not null references nairasplit.expenses on delete cascade,
  member_id uuid not null references nairasplit.members on delete cascade,
  share_kobo bigint not null check (share_kobo >= 0),
  primary key (expense_id, member_id)
);

create function nairasplit.is_member(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from nairasplit.members where group_id = g and user_id = auth.uid());
$$;

alter table nairasplit.groups enable row level security;
alter table nairasplit.members enable row level security;
alter table nairasplit.expenses enable row level security;
alter table nairasplit.expense_shares enable row level security;

create policy "members read group" on nairasplit.groups for select using (nairasplit.is_member(id) or owner_id = auth.uid());
create policy "anyone signed in creates group" on nairasplit.groups for insert with check (owner_id = auth.uid());

create policy "members read members" on nairasplit.members for select using (nairasplit.is_member(group_id));
create policy "members add members" on nairasplit.members for insert
  with check (nairasplit.is_member(group_id) or exists (select 1 from nairasplit.groups g where g.id = group_id and g.owner_id = auth.uid()));

create policy "members read expenses" on nairasplit.expenses for select using (nairasplit.is_member(group_id));
create policy "members add expenses" on nairasplit.expenses for insert with check (nairasplit.is_member(group_id));
create policy "members delete expenses" on nairasplit.expenses for delete using (nairasplit.is_member(group_id));

create policy "members read shares" on nairasplit.expense_shares for select
  using (exists (select 1 from nairasplit.expenses e where e.id = expense_id and nairasplit.is_member(e.group_id)));
create policy "members add shares" on nairasplit.expense_shares for insert
  with check (exists (select 1 from nairasplit.expenses e where e.id = expense_id and nairasplit.is_member(e.group_id)));

-- Insert an expense and its shares in one transaction, validating the shares add up.
create function nairasplit.add_expense(p_group uuid, p_paid_by uuid, p_amount bigint, p_description text,
                                   p_shares jsonb, p_settlement boolean default false)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  new_id uuid;
  total bigint;
begin
  select coalesce(sum((s->>'kobo')::bigint), 0) into total from jsonb_array_elements(p_shares) s;
  if total <> p_amount then raise exception 'Shares (%) must add up to the amount (%)', total, p_amount; end if;
  insert into nairasplit.expenses (group_id, paid_by, amount_kobo, description, is_settlement)
    values (p_group, p_paid_by, p_amount, p_description, p_settlement) returning id into new_id;
  insert into nairasplit.expense_shares (expense_id, member_id, share_kobo)
    select new_id, (s->>'memberId')::uuid, (s->>'kobo')::bigint from jsonb_array_elements(p_shares) s;
  return new_id;
end $$;

-- Join a group with its invite code.
create function nairasplit.join_group(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare g uuid;
begin
  select id into g from nairasplit.groups where invite_code = p_code;
  if g is null then raise exception 'Invalid invite code'; end if;
  insert into nairasplit.members (group_id, user_id, display_name) values (g, auth.uid(), p_name)
    on conflict (group_id, user_id) do nothing;
  return g;
end $$;
grant execute on function nairasplit.join_group to authenticated;

-- Table access is still governed by the RLS policies above.
grant all on all tables in schema nairasplit to anon, authenticated, service_role;
grant all on all sequences in schema nairasplit to anon, authenticated, service_role;
grant execute on all functions in schema nairasplit to anon, authenticated, service_role;
