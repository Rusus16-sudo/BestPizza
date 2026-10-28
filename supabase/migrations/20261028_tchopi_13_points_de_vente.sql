-- =====================================================================
-- Tchopi : le nombre de points de vente suit l'offre
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Starter et Pro : 1 point de vente. Business : 3 inclus, puis autant qu'il
-- faut (chacun en plus est facturé). La base le vérifie elle-même, quel que
-- soit le chemin de l'ajout. Seul le SQL Editor (Tchopi) passe outre.
-- =====================================================================

create or replace function public.check_location_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_plan text;
  existing int;
begin
  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  select plan into org_plan from public.organizations where id = new.organization_id;
  if org_plan = 'business' then
    return new;
  end if;

  select count(*) into existing from public.locations where organization_id = new.organization_id;
  if existing >= 1 then
    raise exception 'Votre offre permet un seul point de vente. Passez à Business pour en ouvrir d''autres.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists check_location_limit on public.locations;
create trigger check_location_limit
  before insert on public.locations
  for each row execute function public.check_location_limit();

-- Un point de vente reste dans son restaurant, et son lien ne change plus :
-- il est imprimé sur les QR codes et partagé sur les réseaux
create or replace function public.protect_location_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.organization_id is distinct from old.organization_id
    or new.slug is distinct from old.slug
  ) then
    raise exception 'Le restaurant et le lien d''un point de vente ne changent pas'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_location_identity on public.locations;
create trigger protect_location_identity
  before update on public.locations
  for each row execute function public.protect_location_identity();

-- « suivi » est aussi une page de la vitrine (/best-pizza/suivi/…)
alter table public.locations drop constraint if exists locations_slug_not_reserved;
alter table public.locations add constraint locations_slug_not_reserved check (slug not in (
  'menu', 'categories', 'product', 'cart', 'checkout', 'favorites', 'offers', 'help', 'manifest', 'suivi'
));

select o.name as restaurant, o.plan as offre, count(l.id) as points_de_vente
from public.organizations o left join public.locations l on l.organization_id = o.id
group by o.name, o.plan order by o.name;
