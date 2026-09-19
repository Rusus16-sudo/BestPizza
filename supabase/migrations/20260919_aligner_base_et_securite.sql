-- =====================================================================
-- Best Pizza : aligne la base sur le code de l'application et la sécurise
-- À exécuter une fois dans Supabase > SQL Editor. Le script peut être
-- relancé sans risque (il ne recrée pas ce qui existe déjà).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Fonctions de rôle (security definer : lisent profiles sans RLS)
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'gerant'), false)
$$;

-- ---------------------------------------------------------------------
-- 1. PRODUCTS : colonnes utilisées par l'application
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists prep_time varchar default '25-35 min',
  add column if not exists customizations jsonb not null default '[]'::jsonb,
  add column if not exists is_available boolean not null default true;

-- La note est calculée à partir de la table reviews ; ces colonnes
-- entreraient en conflit avec la relation « reviews ».
alter table public.products drop column if exists rating;
alter table public.products drop column if exists reviews;

-- ---------------------------------------------------------------------
-- 2. ORDERS
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists short_id varchar,
  add column if not exists total_amount numeric(10,2),
  add column if not exists special_instructions text,
  add column if not exists customer_name varchar,
  add column if not exists promo_code varchar,
  add column if not exists driver_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamp with time zone default now();

-- Statuts : « prete » sépare « la pizza est prête » de « le livreur est parti »
update public.orders set status = 'en_preparation' where status = 'preparation';
update public.orders set status = 'en_route' where status = 'en_livraison';
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('en_attente', 'en_preparation', 'prete', 'en_route', 'livre', 'annule'));

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_driver_idx on public.orders (driver_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. ORDER ITEMS
-- ---------------------------------------------------------------------
alter table public.order_items
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists product_name varchar,
  add column if not exists size varchar default 'Moyenne',
  add column if not exists price numeric(10,2),
  add column if not exists customizations jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- 4. OFFERS, REVIEWS, FAVORITES (tables utilisées par l'app, absentes)
-- ---------------------------------------------------------------------
create table if not exists public.offers (
  id uuid default gen_random_uuid() primary key,
  title varchar not null,
  description text,
  code varchar not null unique,
  theme varchar default 'orange',
  discount_percentage integer not null check (discount_percentage between 1 and 100),
  target_type varchar not null default 'all' check (target_type in ('all', 'category', 'product')),
  target_value text,
  valid_until timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone default now() not null,
  unique (product_id, user_id)
);

create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamp with time zone default now() not null,
  unique (user_id, product_id)
);

-- ---------------------------------------------------------------------
-- 5. SÉCURITÉ (RLS) — remplace les règles « ouvertes à tous »
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "Profils publics ou auth" on public.profiles;
drop policy if exists "Commandes pour tout le monde (à resécuriser)" on public.orders;
drop policy if exists "Items de commandes ouverts (à resécuriser)" on public.order_items;
drop policy if exists "Produits lisibles par tous" on public.products;

-- PROFILES : chacun voit et modifie son profil ; le gérant voit tout
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_manager());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Personne ne peut changer son propre rôle ou se réactiver :
-- seuls le gérant et le serveur (clé service_role) le peuvent.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_manager() then
    raise exception 'Modification du rôle non autorisée';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- PRODUCTS : lecture publique, écriture gérant
drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (true);
drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.is_manager()) with check (public.is_manager());

-- OFFERS : lecture publique, écriture gérant
drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers for select using (true);
drop policy if exists offers_write on public.offers;
create policy offers_write on public.offers for all
  using (public.is_manager()) with check (public.is_manager());

-- REVIEWS : lecture publique ; chacun gère ses avis ; le gérant peut modérer
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (user_id = auth.uid());
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete
  using (user_id = auth.uid() or public.is_manager());

-- FAVORITES : privés
drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ORDERS
--   client   : voit ses commandes (la création passe par le serveur, qui recalcule les prix)
--   cuisine  : voit et fait avancer toutes les commandes
--   livreur  : voit les commandes prêtes non prises, et les siennes
--   gérant   : tout
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select using (
  user_id = auth.uid()
  or public.is_manager()
  or public.current_user_role() = 'cuisinier'
  or (public.current_user_role() = 'livreur' and (driver_id = auth.uid() or (status = 'prete' and driver_id is null)))
);

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders for update
  using (
    public.is_manager()
    or public.current_user_role() = 'cuisinier'
    or (public.current_user_role() = 'livreur' and (driver_id = auth.uid() or (status = 'prete' and driver_id is null)))
  )
  with check (
    public.is_manager()
    or public.current_user_role() = 'cuisinier'
    or (public.current_user_role() = 'livreur' and driver_id = auth.uid())
  );

-- ORDER ITEMS : visibles si la commande l'est (la RLS de orders s'applique)
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_items.order_id)
);

-- ---------------------------------------------------------------------
-- 6. TEMPS RÉEL sur les commandes (écran cuisine, livreur, notifications)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. STOCKAGE des photos produits
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "Photos produits lisibles" on storage.objects;
create policy "Photos produits lisibles" on storage.objects for select
  using (bucket_id = 'products');

drop policy if exists "Photos produits gérées par le gérant" on storage.objects;
create policy "Photos produits gérées par le gérant" on storage.objects for all
  using (bucket_id = 'products' and public.is_manager())
  with check (bucket_id = 'products' and public.is_manager());
