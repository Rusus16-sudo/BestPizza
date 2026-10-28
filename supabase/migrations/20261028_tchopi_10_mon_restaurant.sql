-- =====================================================================
-- Tchopi : le restaurant personnalise l'accueil de sa vitrine
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Photo de couverture et accroche (titre, phrase) de l'accueil, réglées par
-- le propriétaire dans « Mon restaurant ». Vides : l'accueil par défaut.
-- =====================================================================

alter table public.organizations
  add column if not exists cover_url text,
  add column if not exists tagline_title text check (tagline_title is null or char_length(tagline_title) <= 80),
  add column if not exists tagline_text text check (tagline_text is null or char_length(tagline_text) <= 160);

-- La partie publique des enseignes, lue par les vitrines, montre aussi ces réglages
create or replace view public.storefronts as
select id, slug, name, logo_url, primary_color, country, currency, timezone, locale, plan,
       cover_url, tagline_title, tagline_text
from public.organizations
where plan_status <> 'suspended';

revoke all on public.storefronts from anon, authenticated;
grant select on public.storefronts to anon, authenticated;

-- VÉRIFICATION
select slug, name, cover_url, tagline_title from public.storefronts order by name;
