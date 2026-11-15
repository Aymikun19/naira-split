-- NairaSplit schema. Money is stored as integer kobo.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users default auth.uid(),
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid references auth.users,           -- null for people without an account
  display_name text not null,
  unique (group_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  paid_by uuid not null references public.members on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  description text not null,
  is_settlement boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.expense_shares (
  expense_id uuid not null references public.expenses on delete cascade,
  member_id uuid not null references public.members on delete cascade,
  share_kobo bigint not null check (share_kobo >= 0),
  primary key (expense_id, member_id)
);

create function public.is_member(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where group_id = g and user_id = auth.uid());
$$;

alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;

create policy "members read group" on public.groups for select using (public.is_member(id) or owner_id = auth.uid());
create policy "anyone signed in creates group" on public.groups for insert with check (owner_id = auth.uid());

create policy "members read members" on public.members for select using (public.is_member(group_id));
create policy "members add members" on public.members for insert
  with check (public.is_member(group_id) or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

create policy "members read expenses" on public.expenses for select using (public.is_member(group_id));
create policy "members add expenses" on public.expenses for insert with check (public.is_member(group_id));
create policy "members delete expenses" on public.expenses for delete using (public.is_member(group_id));

create policy "members read shares" on public.expense_shares for select
  using (exists (select 1 from public.expenses e where e.id = expense_id and public.is_member(e.group_id)));
create policy "members add shares" on public.expense_shares for insert
  with check (exists (select 1 from public.expenses e where e.id = expense_id and public.is_member(e.group_id)));

-- Insert an expense and its shares in one transaction, validating the shares add up.
create function public.add_expense(p_group uuid, p_paid_by uuid, p_amount bigint, p_description text,
                                   p_shares jsonb, p_settlement boolean default false)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  new_id uuid;
  total bigint;
begin
  select coalesce(sum((s->>'kobo')::bigint), 0) into total from jsonb_array_elements(p_shares) s;
  if total <> p_amount then raise exception 'Shares (%) must add up to the amount (%)', total, p_amount; end if;
  insert into public.expenses (group_id, paid_by, amount_kobo, description, is_settlement)
    values (p_group, p_paid_by, p_amount, p_description, p_settlement) returning id into new_id;
  insert into public.expense_shares (expense_id, member_id, share_kobo)
    select new_id, (s->>'memberId')::uuid, (s->>'kobo')::bigint from jsonb_array_elements(p_shares) s;
  return new_id;
end $$;

-- Join a group with its invite code.
create function public.join_group(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare g uuid;
begin
  select id into g from public.groups where invite_code = p_code;
  if g is null then raise exception 'Invalid invite code'; end if;
  insert into public.members (group_id, user_id, display_name) values (g, auth.uid(), p_name)
    on conflict (group_id, user_id) do nothing;
  return g;
end $$;
grant execute on function public.join_group to authenticated;
