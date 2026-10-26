-- =====================================================================
-- Tchopi, phase 1, étape 3 : fin de la transition
-- À exécuter dans Supabase > SQL Editor, APRÈS l'étape 2 ET après le
-- déploiement du code qui indique lui-même l'enseigne et le point de vente
-- (commit « Feat: staff rights come from memberships »).
-- Peut être relancé sans risque.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Le code indique maintenant l'enseigne : les rattachements automatiques
--    à Best Pizza et la copie du rôle du profil vers les membres s'arrêtent
-- ---------------------------------------------------------------------
drop trigger if exists orders_10_default_tenant on public.orders;
drop trigger if exists products_10_default_tenant on public.products;
drop trigger if exists offers_10_default_tenant on public.offers;
drop function if exists public.transition_default_tenant();

drop trigger if exists profiles_sync_membership on public.profiles;
drop function if exists public.transition_sync_membership();

-- ---------------------------------------------------------------------
-- 2. Plus aucune donnée sans établissement
-- ---------------------------------------------------------------------
alter table public.products alter column organization_id set not null;
alter table public.offers   alter column organization_id set not null;
alter table public.reviews  alter column organization_id set not null;
alter table public.orders   alter column organization_id set not null;
alter table public.orders   alter column location_id set not null;
alter table public.orders   alter column order_number set not null;

-- ---------------------------------------------------------------------
-- 3. Un code promo est unique dans son enseigne, pas sur toute la plateforme :
--    deux restaurants peuvent chacun avoir leur « BIENVENUE10 »
-- ---------------------------------------------------------------------
alter table public.offers drop constraint if exists offers_code_key;
drop index if exists public.offers_code_key;
create unique index if not exists offers_organization_code_idx on public.offers (organization_id, code);

-- ---------------------------------------------------------------------
-- 4. Photos des plats : un dossier par enseigne ({organization_id}/photo.jpg),
--    et chaque gérant ne gère que celui de son enseigne
-- ---------------------------------------------------------------------
create or replace function public.storage_organization_id(object_name text)
returns uuid
language sql immutable
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
  end
$$;

drop policy if exists "Photos produits gérées par le gérant" on storage.objects;
create policy "Photos produits gérées par le gérant" on storage.objects for all
  using (bucket_id = 'products' and public.is_org_manager(public.storage_organization_id(name)))
  with check (bucket_id = 'products' and public.is_org_manager(public.storage_organization_id(name)));

drop function if exists public.is_any_org_manager();

-- ---------------------------------------------------------------------
-- 5. Le rôle du profil ne donne plus aucun droit : seul le serveur peut encore
--    le modifier (il ne distingue plus que les clients)
-- ---------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Modification du rôle non autorisée';
  end if;
  return new;
end;
$$;

comment on column public.profiles.role is
  'Historique : les droits du personnel viennent de la table memberships. Ne pas s''en servir pour autoriser quoi que ce soit.';

-- ---------------------------------------------------------------------
-- 6. VÉRIFICATION : chaque ligne doit afficher « oui »
-- ---------------------------------------------------------------------
select 'déclencheurs de transition retirés' as controle,
       case when not exists (
         select 1 from pg_trigger
         where tgname in ('orders_10_default_tenant', 'products_10_default_tenant', 'offers_10_default_tenant', 'profiles_sync_membership')
       ) then 'oui' else 'NON' end as resultat
union all
select 'commandes : établissement obligatoire',
       case when (select is_nullable from information_schema.columns
                  where table_schema = 'public' and table_name = 'orders' and column_name = 'location_id') = 'NO'
       then 'oui' else 'NON' end
union all
select 'photos : un dossier par enseigne',
       case when exists (select 1 from pg_policies where schemaname = 'storage'
                         and policyname = 'Photos produits gérées par le gérant' and qual like '%storage_organization_id%')
       then 'oui' else 'NON' end;
