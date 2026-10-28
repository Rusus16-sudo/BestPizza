-- =====================================================================
-- Tchopi : un compte peut être supprimé
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Le profil, créé à la main au début du projet, bloquait la suppression de
-- son compte. Désormais, supprimer un compte supprime son profil ; ses
-- commandes restent au restaurant (historique, chiffre d'affaires), sans
-- compte rattaché, comme une commande sans compte.
-- =====================================================================

alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id) references auth.users (id) on delete cascade;

alter table public.orders
  drop constraint if exists orders_user_id_fkey,
  add constraint orders_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete set null;

select conrelid::regclass as table_liee, conname as lien,
       case confdeltype when 'c' then 'cascade' when 'n' then 'set null' else 'BLOQUE' end as a_la_suppression
from pg_constraint
where conname in ('profiles_id_fkey', 'orders_user_id_fkey');
