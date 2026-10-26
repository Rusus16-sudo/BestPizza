-- =====================================================================
-- Tchopi, phase 1, étape 1 : enseignes, points de vente et membres
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- N'ajoute que des choses : l'application actuelle continue de marcher.
-- Toutes les données existantes sont rattachées à Best Pizza, premier
-- établissement de la plateforme. Les règles d'accès (RLS) ne changent
-- qu'à l'étape 2.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENSEIGNES : la marque (carte, logo, abonnement)
-- ---------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  -- Adresse du lien : tchopi.cm/best-pizza
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 40),
  name text not null,
  logo_url text,
  primary_color text not null default '#d93a1f',
  -- Le Cameroun d'abord, le reste de l'Afrique ensuite
  country char(2) not null default 'CM',
  currency char(3) not null default 'XAF',
  timezone text not null default 'Africa/Douala',
  locale text not null default 'fr',
  plan text not null default 'pro' check (plan in ('starter', 'pro', 'business')),
  plan_status text not null default 'trial' check (plan_status in ('trial', 'active', 'past_due', 'suspended')),
  trial_ends_at timestamp with time zone,
  -- Prochain numéro de commande de l'enseigne (1, 2, 3…)
  next_order_number integer not null default 1,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- 2. POINTS DE VENTE : une adresse, ses commandes, sa cuisine, ses livreurs
-- ---------------------------------------------------------------------
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- tchopi.cm/best-pizza/bastos
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 40),
  name text not null,
  address text,
  phone text,
  is_open boolean not null default true,
  created_at timestamp with time zone default now(),
  unique (organization_id, slug)
);

create index if not exists locations_organization_idx on public.locations (organization_id);

-- ---------------------------------------------------------------------
-- 3. MEMBRES : qui travaille où, avec quel rôle
--    location_id vide = toute l'enseigne (propriétaire, gérant d'enseigne)
-- ---------------------------------------------------------------------
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  role text not null check (role in ('proprietaire', 'gerant', 'cuisinier', 'livreur')),
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  unique (user_id, organization_id)
);

create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists memberships_organization_idx on public.memberships (organization_id);

-- ---------------------------------------------------------------------
-- 4. DISPONIBILITÉ DES PLATS PAR POINT DE VENTE
--    Une carte par enseigne ; chaque point de vente peut marquer une
--    rupture ou pratiquer un autre prix. Sans ligne ici : disponible, prix de l'enseigne.
-- ---------------------------------------------------------------------
create table if not exists public.product_locations (
  product_id uuid not null references public.products (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  is_available boolean not null default true,
  price_override numeric check (price_override is null or price_override >= 0),
  primary key (product_id, location_id)
);

-- Ces tables ne sont lues que par le serveur (clé service_role) jusqu'à l'étape 2,
-- qui ajoute leurs règles d'accès.
alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.memberships enable row level security;
alter table public.product_locations enable row level security;

-- ---------------------------------------------------------------------
-- 5. RATTACHEMENT DES DONNÉES À UNE ENSEIGNE / UN POINT DE VENTE
-- ---------------------------------------------------------------------
alter table public.products add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table public.offers   add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table public.reviews  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table public.orders   add column if not exists organization_id uuid references public.organizations (id);
alter table public.orders   add column if not exists location_id uuid references public.locations (id);
alter table public.orders   add column if not exists order_number integer;

create index if not exists products_organization_idx on public.products (organization_id);
create index if not exists offers_organization_idx on public.offers (organization_id);
create index if not exists reviews_organization_idx on public.reviews (organization_id);
create index if not exists orders_organization_idx on public.orders (organization_id);
create index if not exists orders_location_status_idx on public.orders (location_id, status);
create unique index if not exists orders_organization_number_idx on public.orders (organization_id, order_number);

-- ---------------------------------------------------------------------
-- 6. BEST PIZZA, PREMIER ÉTABLISSEMENT
-- ---------------------------------------------------------------------
insert into public.organizations (slug, name, plan, plan_status)
values ('best-pizza', 'Best Pizza', 'business', 'active')
on conflict (slug) do nothing;

insert into public.locations (organization_id, slug, name)
select id, 'principal', 'Best Pizza'
from public.organizations where slug = 'best-pizza'
on conflict (organization_id, slug) do nothing;

update public.products set organization_id = (select id from public.organizations where slug = 'best-pizza')
where organization_id is null;
update public.offers set organization_id = (select id from public.organizations where slug = 'best-pizza')
where organization_id is null;
update public.reviews set organization_id = (select id from public.organizations where slug = 'best-pizza')
where organization_id is null;
update public.orders o
set organization_id = l.organization_id, location_id = l.id
from public.locations l
join public.organizations org on org.id = l.organization_id
where org.slug = 'best-pizza' and l.slug = 'principal' and o.organization_id is null;

-- Numéros de commande : dans l'ordre de passage, propres à l'enseigne
with numbered as (
  select id, row_number() over (partition by organization_id order by created_at, id) as n
  from public.orders
  where order_number is null and organization_id is not null
)
update public.orders o
set order_number = numbered.n
  + coalesce((select max(order_number) from public.orders x where x.organization_id = o.organization_id), 0)
from numbered
where o.id = numbered.id;

update public.organizations org
set next_order_number = coalesce((select max(order_number) from public.orders where organization_id = org.id), 0) + 1;

-- Le personnel actuel devient membre de Best Pizza
insert into public.memberships (user_id, organization_id, role, is_active)
select p.id,
       (select id from public.organizations where slug = 'best-pizza'),
       case when p.role in ('admin', 'gerant') then 'proprietaire' else p.role end,
       coalesce(p.is_active, true)
from public.profiles p
where p.role in ('admin', 'gerant', 'cuisinier', 'livreur')
on conflict (user_id, organization_id) do nothing;

-- ---------------------------------------------------------------------
-- 7. NUMÉRO DE COMMANDE AUTOMATIQUE
-- ---------------------------------------------------------------------
create or replace function public.assign_order_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is not null and new.order_number is null then
    update public.organizations
    set next_order_number = next_order_number + 1
    where id = new.organization_id
    returning next_order_number - 1 into new.order_number;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 8. TRANSITION : tant que le code n'indique pas encore l'enseigne,
--    tout ce qui est créé revient à Best Pizza. Retiré à l'étape 3.
-- ---------------------------------------------------------------------
create or replace function public.transition_default_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select id into new.organization_id from public.organizations where slug = 'best-pizza';
  end if;
  if tg_table_name = 'orders' and new.location_id is null then
    select id into new.location_id from public.locations
    where organization_id = new.organization_id
    order by created_at
    limit 1;
  end if;
  return new;
end $$;

-- Les déclencheurs d'une même table s'exécutent par ordre alphabétique :
-- l'enseigne est fixée (10) avant que le numéro soit attribué (20).
drop trigger if exists orders_10_default_tenant on public.orders;
create trigger orders_10_default_tenant before insert on public.orders
  for each row execute function public.transition_default_tenant();

drop trigger if exists orders_20_order_number on public.orders;
create trigger orders_20_order_number before insert on public.orders
  for each row execute function public.assign_order_number();

drop trigger if exists products_10_default_tenant on public.products;
create trigger products_10_default_tenant before insert on public.products
  for each row execute function public.transition_default_tenant();

drop trigger if exists offers_10_default_tenant on public.offers;
create trigger offers_10_default_tenant before insert on public.offers
  for each row execute function public.transition_default_tenant();

drop trigger if exists reviews_10_default_tenant on public.reviews;
create trigger reviews_10_default_tenant before insert on public.reviews
  for each row execute function public.transition_default_tenant();

-- ---------------------------------------------------------------------
-- 9. VÉRIFICATION : tout doit être rattaché (chaque ligne doit afficher 0)
-- ---------------------------------------------------------------------
select 'produits sans enseigne' as controle, count(*) from public.products where organization_id is null
union all select 'commandes sans point de vente', count(*) from public.orders where location_id is null
union all select 'commandes sans numéro', count(*) from public.orders where order_number is null
union all select 'avis sans enseigne', count(*) from public.reviews where organization_id is null
union all select 'offres sans enseigne', count(*) from public.offers where organization_id is null;
