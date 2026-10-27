-- =====================================================================
-- Tchopi, phase 2, étape 2.5 : finitions
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Un numéro de commande lisible, propre à chaque restaurant : #1, #2, #3…
--    (au lieu de « CMD-14360 », tiré au hasard). Les commandes existantes
--    prennent leur numéro.
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
  if new.short_id is null and new.order_number is not null then
    new.short_id := '#' || new.order_number;
  end if;
  return new;
end $$;

update public.orders
set short_id = '#' || order_number
where short_id is distinct from '#' || order_number;

-- ---------------------------------------------------------------------
-- 2. Le prénom de l'auteur d'un avis, fixé par la base : le gérant le voit
--    sans lire le profil du client, et personne ne signe à la place d'un autre.
-- ---------------------------------------------------------------------
alter table public.reviews add column if not exists author_name text;

create or replace function public.set_review_organization()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- L'avis appartient à l'enseigne du plat noté, quoi que le navigateur envoie
  select organization_id into new.organization_id from public.products where id = new.product_id;
  -- Et il est signé du prénom de son auteur (ou du début de son email)
  select coalesce(nullif(trim(first_name), ''), split_part(email, '@', 1), 'Client')
    into new.author_name
    from public.profiles where id = new.user_id;
  return new;
end $$;

-- Recalculé à chaque création ou modification, pour qu'on ne puisse pas changer la signature
drop trigger if exists reviews_10_organization on public.reviews;
create trigger reviews_10_organization before insert or update on public.reviews
  for each row execute function public.set_review_organization();

update public.reviews r
set author_name = coalesce(nullif(trim(p.first_name), ''), split_part(p.email, '@', 1), 'Client')
from public.profiles p
where p.id = r.user_id and r.author_name is null;

-- VÉRIFICATION
select (select string_agg(short_id, ', ' order by order_number) from public.orders) as numeros,
       (select string_agg(coalesce(author_name, '?'), ', ') from public.reviews) as auteurs_des_avis;
