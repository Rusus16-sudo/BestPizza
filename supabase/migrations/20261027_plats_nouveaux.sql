-- =====================================================================
-- Tchopi : le gérant marque un plat « Nouveau »
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Le badge « Nouveau » s'affichait sur tout plat sans avis. C'est désormais
-- le gérant qui le choisit ; il s'efface seul à la date indiquée ici
-- (30 jours après l'avoir coché), pour qu'un plat ne reste pas « nouveau » des années.
-- =====================================================================

alter table public.products add column if not exists new_until timestamp with time zone;

comment on column public.products.new_until is
  'Le plat est affiché « Nouveau » jusqu''à cette date. Vide : pas de badge.';

select 'colonne new_until ajoutée' as resultat;
