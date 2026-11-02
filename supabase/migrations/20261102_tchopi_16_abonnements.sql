-- =====================================================================
-- Tchopi : les abonnements
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- 1. « Payé jusqu'au » : la date de fin de l'abonnement payé d'un restaurant
--    (vide = sans fin, comme Best Pizza). Seul Tchopi la change.
-- 2. Les paiements d'abonnement (SasPay), un par mois ou par an payé.
-- 3. Les administrateurs de Tchopi, qui voient et gèrent tous les restaurants.
-- 4. L'offre Starter : 30 plats au plus.
-- =====================================================================

-- 1. Payé jusqu'au
alter table public.organizations
  add column if not exists paid_until timestamp with time zone;

create or replace function public.protect_organization_plan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.plan is distinct from old.plan
    or new.plan_status is distinct from old.plan_status
    or new.trial_ends_at is distinct from old.trial_ends_at
    or new.paid_until is distinct from old.paid_until
    or new.slug is distinct from old.slug
  ) then
    raise exception 'Seul Tchopi peut changer l''offre ou l''adresse d''un restaurant'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 2. Paiements d'abonnement
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan text not null check (plan in ('starter', 'pro', 'business')),
  months integer not null check (months in (1, 12)),
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  provider text not null default 'saspay',
  provider_session_id text,
  provider_transaction_id text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamp with time zone not null default now(),
  paid_at timestamp with time zone
);

create index if not exists subscription_payments_org_idx on public.subscription_payments (organization_id, created_at desc);

-- Le gérant voit les paiements de son restaurant ; seul le serveur (clé service) les écrit
alter table public.subscription_payments enable row level security;
drop policy if exists subscription_payments_select on public.subscription_payments;
create policy subscription_payments_select on public.subscription_payments for select
  using (public.is_org_manager(organization_id));

-- 3. Administrateurs de Tchopi
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamp with time zone not null default now()
);
alter table public.platform_admins enable row level security;
drop policy if exists platform_admins_self on public.platform_admins;
create policy platform_admins_self on public.platform_admins for select using (user_id = auth.uid());

insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'teingorus@gmail.com'
on conflict do nothing;

-- 4. Starter : 30 plats au plus (le SQL Editor de Tchopi passe outre)
create or replace function public.check_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_plan text;
  existing int;
begin
  if session_user in ('postgres', 'supabase_admin') or new.organization_id is null then
    return new;
  end if;
  select plan into org_plan from public.organizations where id = new.organization_id;
  if org_plan = 'starter' then
    select count(*) into existing from public.products where organization_id = new.organization_id;
    if existing >= 30 then
      raise exception 'L''offre Starter permet 30 plats. Passez à Pro pour une carte illimitée.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_product_limit on public.products;
create trigger check_product_limit
  before insert on public.products
  for each row execute function public.check_product_limit();

select (select count(*) from public.platform_admins) as administrateurs_tchopi,
       'abonnements prêts' as resultat;
