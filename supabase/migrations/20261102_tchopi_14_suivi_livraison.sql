-- =====================================================================
-- Tchopi : un suivi de livraison complet
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- 1. L'heure de chaque étape d'une commande, notée par la base elle-même.
-- 2. La position exacte du client (« 📍 Ma position » au moment de commander).
-- 3. La dernière position du livreur, gardée pour que le client le voie toujours.
-- =====================================================================

-- 1. Heure de chaque étape
alter table public.orders
  add column if not exists accepted_at timestamp with time zone,
  add column if not exists ready_at timestamp with time zone,
  add column if not exists picked_at timestamp with time zone,
  add column if not exists delivered_at timestamp with time zone,
  add column if not exists cancelled_at timestamp with time zone;

create or replace function public.stamp_order_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'en_preparation' then new.accepted_at := coalesce(new.accepted_at, now());
      when 'prete' then new.ready_at := coalesce(new.ready_at, now());
      when 'en_route' then new.picked_at := coalesce(new.picked_at, now());
      when 'livre' then new.delivered_at := coalesce(new.delivered_at, now());
      when 'annule' then new.cancelled_at := coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_order_status on public.orders;
create trigger stamp_order_status
  before update on public.orders
  for each row execute function public.stamp_order_status();

-- 2. Position exacte du client, s'il l'a partagée
alter table public.orders
  add column if not exists delivery_lat double precision check (delivery_lat is null or delivery_lat between -90 and 90),
  add column if not exists delivery_lng double precision check (delivery_lng is null or delivery_lng between -180 and 180);

-- 3. Dernière position du livreur, une ligne par livraison en cours.
--    Table à part : la position change souvent, sans réveiller les écrans qui
--    écoutent les commandes ni le webhook des notifications.
create table if not exists public.driver_positions (
  order_id uuid primary key references public.orders (id) on delete cascade,
  driver_id uuid not null references auth.users (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  updated_at timestamp with time zone not null default now()
);

alter table public.driver_positions enable row level security;

-- Seul le livreur de la commande, pendant qu'il la livre, écrit sa position
drop policy if exists driver_positions_write on public.driver_positions;
create policy driver_positions_write on public.driver_positions for all
  using (driver_id = auth.uid())
  with check (
    driver_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.driver_id = auth.uid() and o.status = 'en_route'
    )
  );

-- Le personnel du point de vente la voit (le client la lit par son lien de suivi, côté serveur)
drop policy if exists driver_positions_select on public.driver_positions;
create policy driver_positions_select on public.driver_positions for select
  using (
    driver_id = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and public.has_location_role(o.location_id, array['proprietaire', 'gerant'])
    )
  );

select 'suivi de livraison prêt' as resultat;
