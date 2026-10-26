-- =====================================================================
-- Tchopi, phase 1, étape 2 : chacun ne voit que son établissement
-- À exécuter dans Supabase > SQL Editor, APRÈS l'étape 1
-- (20261026_tchopi_1_etablissements.sql). Peut être relancé sans risque.
--
-- Les règles d'accès ne reposent plus sur le rôle unique du profil, mais
-- sur les membres : tel compte a tel rôle dans telle enseigne, pour toute
-- l'enseigne ou un seul point de vente. Pour Best Pizza, rien ne change à
-- l'écran : son personnel est membre de Best Pizza depuis l'étape 1.
--
-- En cas de problème : 20261026_tchopi_2_retour_arriere.sql remet les
-- règles d'avant.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FONCTIONS DE CONTRÔLE
--    security definer : elles lisent les membres sans passer par la RLS
-- ---------------------------------------------------------------------

-- Le compte connecté a-t-il l'un de ces rôles pour ce point de vente ?
-- Oui s'il y est rattaché, ou s'il travaille pour toute l'enseigne.
-- Le propriétaire a accès à tous les points de vente de son enseigne.
create or replace function public.has_location_role(loc uuid, roles text[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.locations l on l.organization_id = m.organization_id
    where l.id = loc
      and m.user_id = auth.uid()
      and m.is_active
      and m.role = any (roles)
      and (m.location_id is null or m.location_id = loc or m.role = 'proprietaire')
  )
$$;

-- Le compte connecté gère-t-il toute cette enseigne (carte, offres, équipe) ?
create or replace function public.is_org_manager(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.is_active
      and (m.role = 'proprietaire' or (m.role = 'gerant' and m.location_id is null))
  )
$$;

-- Le compte connecté est-il membre actif de cette enseigne, quel que soit son rôle ?
create or replace function public.is_org_member(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid() and m.is_active
  )
$$;

-- Ce compte fait-il partie d'une équipe que le compte connecté gère ?
create or replace function public.manages_member(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships them
    where them.user_id = target and public.is_org_manager(them.organization_id)
  )
$$;

-- Le compte connecté gère-t-il au moins une enseigne ? (photos des produits, en attendant
-- un dossier par enseigne)
create or replace function public.is_any_org_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.is_active
      and (m.role = 'proprietaire' or (m.role = 'gerant' and m.location_id is null))
  )
$$;

-- ---------------------------------------------------------------------
-- 2. COMMANDES
--   client   : ses commandes (la création passe par le serveur, qui recalcule les prix)
--   cuisine  : les commandes de son point de vente
--   livreur  : de son point de vente, les commandes prêtes non prises, et les siennes
--   gérant   : les commandes de son point de vente, ou de toute l'enseigne
-- ---------------------------------------------------------------------
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select using (
  user_id = auth.uid()
  or public.has_location_role(location_id, array['proprietaire', 'gerant', 'cuisinier'])
  or (public.has_location_role(location_id, array['livreur'])
      and (driver_id = auth.uid() or (status = 'prete' and driver_id is null)))
);

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders for update
  using (
    public.has_location_role(location_id, array['proprietaire', 'gerant', 'cuisinier'])
    or (public.has_location_role(location_id, array['livreur'])
        and (driver_id = auth.uid() or (status = 'prete' and driver_id is null)))
  )
  with check (
    public.has_location_role(location_id, array['proprietaire', 'gerant', 'cuisinier'])
    or (public.has_location_role(location_id, array['livreur']) and driver_id = auth.uid())
  );

-- ORDER ITEMS : inchangé, visibles si la commande l'est (la RLS de orders s'applique)

-- ---------------------------------------------------------------------
-- 3. CARTE, OFFRES, AVIS : lecture publique, écriture par l'enseigne
-- ---------------------------------------------------------------------
drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

drop policy if exists offers_write on public.offers;
create policy offers_write on public.offers for all
  using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

-- Un avis appartient à l'enseigne du plat noté, quoi que le navigateur envoie
create or replace function public.set_review_organization()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select organization_id into new.organization_id from public.products where id = new.product_id;
  return new;
end $$;

drop trigger if exists reviews_10_default_tenant on public.reviews;
drop trigger if exists reviews_10_organization on public.reviews;
create trigger reviews_10_organization before insert or update of product_id on public.reviews
  for each row execute function public.set_review_organization();

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete
  using (user_id = auth.uid() or public.is_org_manager(organization_id));

-- Disponibilité par point de vente : lecture publique ; le gérant du point de vente
-- ou de l'enseigne la modifie
drop policy if exists product_locations_select on public.product_locations;
create policy product_locations_select on public.product_locations for select using (true);
drop policy if exists product_locations_write on public.product_locations;
create policy product_locations_write on public.product_locations for all
  using (public.has_location_role(location_id, array['proprietaire', 'gerant']))
  with check (public.has_location_role(location_id, array['proprietaire', 'gerant']));

-- ---------------------------------------------------------------------
-- 4. ENSEIGNES, POINTS DE VENTE, MEMBRES
-- ---------------------------------------------------------------------
-- L'enseigne (offre, abonnement…) n'est lisible que par ses membres ; la vitrine
-- publique de la phase 2 passera par le serveur.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select
  using (public.is_org_member(id));
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update
  using (public.is_org_manager(id)) with check (public.is_org_manager(id));

-- Adresse, téléphone, ouvert ou fermé : informations publiques
drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations for select using (true);
drop policy if exists locations_write on public.locations;
create policy locations_write on public.locations for all
  using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

-- Chacun voit ses appartenances ; le gérant voit son équipe.
-- Créer ou modifier un membre passe par le serveur.
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships for select
  using (user_id = auth.uid() or public.is_org_manager(organization_id));

-- ---------------------------------------------------------------------
-- 5. PROFILS : chacun le sien ; le gérant, ceux de son équipe (et plus ceux de tout le monde)
-- ---------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.manages_member(id));

-- ---------------------------------------------------------------------
-- 6. PHOTOS DES PRODUITS
--    Transition : tout gérant d'enseigne peut en déposer. L'étape 3 range les
--    photos dans un dossier par enseigne et limite chacun au sien.
-- ---------------------------------------------------------------------
drop policy if exists "Photos produits gérées par le gérant" on storage.objects;
create policy "Photos produits gérées par le gérant" on storage.objects for all
  using (bucket_id = 'products' and public.is_any_org_manager())
  with check (bucket_id = 'products' and public.is_any_org_manager());

-- ---------------------------------------------------------------------
-- 7. TRANSITION : l'espace gérant crée et suspend encore le personnel via
--    profiles.role / is_active. On reporte ces changements sur les membres
--    de Best Pizza. Retiré à l'étape 3, quand le code écrira les membres.
-- ---------------------------------------------------------------------
create or replace function public.transition_sync_membership()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bp uuid;
begin
  select id into bp from public.organizations where slug = 'best-pizza';
  if bp is null then return new; end if;

  if new.role in ('admin', 'gerant', 'cuisinier', 'livreur') then
    insert into public.memberships (user_id, organization_id, role, is_active)
    values (new.id, bp,
            case when new.role in ('admin', 'gerant') then 'proprietaire' else new.role end,
            coalesce(new.is_active, true))
    on conflict (user_id, organization_id)
    do update set role = excluded.role, is_active = excluded.is_active;
  elsif tg_op = 'UPDATE' and old.role in ('admin', 'gerant', 'cuisinier', 'livreur') then
    delete from public.memberships where user_id = new.id and organization_id = bp;
  end if;
  return new;
end $$;

drop trigger if exists profiles_sync_membership on public.profiles;
create trigger profiles_sync_membership
  after insert or update of role, is_active on public.profiles
  for each row execute function public.transition_sync_membership();

-- ---------------------------------------------------------------------
-- 8. VÉRIFICATION : les nouvelles règles sont en place (chaque ligne doit afficher oui)
-- ---------------------------------------------------------------------
select 'commandes : ' || policyname as regle,
       case when qual like '%has_location_role%' then 'oui' else 'NON' end as nouvelle_regle
from pg_policies
where schemaname = 'public' and tablename = 'orders' and policyname in ('orders_select', 'orders_update_staff')
union all
select 'carte : ' || policyname, case when qual like '%is_org_manager%' then 'oui' else 'NON' end
from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'products_write'
union all
select 'profils : ' || policyname, case when qual like '%manages_member%' then 'oui' else 'NON' end
from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select';
