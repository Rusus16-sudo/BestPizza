-- =====================================================================
-- Tchopi : seul Tchopi change l'offre d'un restaurant
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Le propriétaire modifie son restaurant (nom, logo, couleur, accueil), mais
-- pas son offre, son essai gratuit ni l'adresse de sa vitrine : ces champs ne
-- changent que côté serveur (clé service) ou depuis le SQL Editor.
-- =====================================================================

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
    or new.slug is distinct from old.slug
  ) then
    raise exception 'Seul Tchopi peut changer l''offre ou l''adresse d''un restaurant'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_organization_plan on public.organizations;
create trigger protect_organization_plan
  before update on public.organizations
  for each row execute function public.protect_organization_plan();

select 'offre protégée' as resultat;
