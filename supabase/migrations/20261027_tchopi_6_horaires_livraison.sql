-- =====================================================================
-- Tchopi, phase 2, étape 2.3 : horaires et livraison
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Chaque point de vente règle lui-même ses horaires, ses frais de livraison
-- (forfait, ou tarif par quartier), sa commande minimum et sa livraison gratuite.
-- C'est le gérant qui les définit, depuis son espace.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. HORAIRES ET LIVRAISON D'UN POINT DE VENTE
--    opening_hours : pour chaque jour (0 = dimanche … 6 = samedi), une liste de
--    plages [ouverture, fermeture]. Liste vide : fermé ce jour-là.
--    Une plage qui finit après minuit (ex. 18:00 → 02:00) est acceptée.
--    is_open (déjà là) : le bouton « Fermer maintenant » du gérant.
-- ---------------------------------------------------------------------
alter table public.locations
  add column if not exists opening_hours jsonb not null default
    '{"0":[["11:00","23:00"]],"1":[["11:00","23:00"]],"2":[["11:00","23:00"]],"3":[["11:00","23:00"]],"4":[["11:00","23:00"]],"5":[["11:00","23:00"]],"6":[["11:00","23:00"]]}'::jsonb,
  add column if not exists delivery_fee numeric not null default 1000 check (delivery_fee >= 0),
  add column if not exists minimum_order numeric check (minimum_order is null or minimum_order >= 0),
  add column if not exists free_delivery_from numeric check (free_delivery_from is null or free_delivery_from >= 0);

comment on column public.locations.opening_hours is
  'Plages d''ouverture par jour (0 = dimanche) : {"1": [["11:00","15:00"], ["18:00","23:00"]]}. Liste vide : fermé.';
comment on column public.locations.delivery_fee is
  'Forfait de livraison, en devise de l''enseigne. Sert quand le point de vente n''a pas de quartiers.';

-- ---------------------------------------------------------------------
-- 2. QUARTIERS DESSERVIS, AVEC LEUR TARIF (offres Pro et Business)
-- ---------------------------------------------------------------------
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  fee numeric not null default 0 check (fee >= 0),
  position integer not null default 0,
  created_at timestamp with time zone default now(),
  unique (location_id, name)
);

create index if not exists delivery_zones_location_idx on public.delivery_zones (location_id);

alter table public.delivery_zones enable row level security;

-- Le client voit les quartiers desservis ; le gérant du point de vente (ou de
-- l'enseigne) les gère
drop policy if exists delivery_zones_select on public.delivery_zones;
create policy delivery_zones_select on public.delivery_zones for select using (true);
drop policy if exists delivery_zones_write on public.delivery_zones;
create policy delivery_zones_write on public.delivery_zones for all
  using (public.has_location_role(location_id, array['proprietaire', 'gerant']))
  with check (public.has_location_role(location_id, array['proprietaire', 'gerant']));

-- ---------------------------------------------------------------------
-- 3. LE GÉRANT D'UN POINT DE VENTE RÈGLE LE SIEN
--    (avant : seul le gérant de toute l'enseigne pouvait modifier un point de vente)
--    Créer ou supprimer un point de vente reste réservé à l'enseigne.
-- ---------------------------------------------------------------------
drop policy if exists locations_write on public.locations;
drop policy if exists locations_insert on public.locations;
drop policy if exists locations_delete on public.locations;
drop policy if exists locations_update on public.locations;
create policy locations_insert on public.locations for insert
  with check (public.is_org_manager(organization_id));
create policy locations_delete on public.locations for delete
  using (public.is_org_manager(organization_id));
create policy locations_update on public.locations for update
  using (public.has_location_role(id, array['proprietaire', 'gerant']))
  with check (public.has_location_role(id, array['proprietaire', 'gerant']));

-- ---------------------------------------------------------------------
-- 4. LES FRAIS DE LIVRAISON D'UNE COMMANDE (compris dans total_amount)
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists delivery_fee numeric not null default 0,
  add column if not exists delivery_zone text;

-- ---------------------------------------------------------------------
-- VÉRIFICATION
-- ---------------------------------------------------------------------
select l.name as point_de_vente, l.delivery_fee as forfait, l.opening_hours->'1' as lundi
from public.locations l;
