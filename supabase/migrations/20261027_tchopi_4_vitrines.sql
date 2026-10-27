-- =====================================================================
-- Tchopi, phase 2, étape 2.1 : une vitrine par établissement
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- La vitrine d'un restaurant doit afficher son nom, son logo et sa couleur
-- à n'importe quel visiteur. La table des enseignes reste réservée à leurs
-- membres (elle contient l'offre et l'abonnement) : cette vue n'en montre
-- que la partie publique, et seulement pour les établissements actifs.
-- =====================================================================

create or replace view public.storefronts as
select id, slug, name, logo_url, primary_color, country, currency, timezone, locale, plan
from public.organizations
where plan_status <> 'suspended';

comment on view public.storefronts is
  'Partie publique des enseignes, pour les vitrines. Lecture seule, sans offre ni abonnement détaillés.';

-- La vue lit la table avec les droits de son propriétaire : elle passe outre la RLS
-- des enseignes, mais ne laisse voir que ces colonnes.
revoke all on public.storefronts from anon, authenticated;
grant select on public.storefronts to anon, authenticated;

-- Les adresses des vitrines et des points de vente ne doivent pas prendre la place
-- des pages de l'application (tchopi.cm/admin, tchopi.cm/best-pizza/menu…)
alter table public.organizations drop constraint if exists organizations_slug_not_reserved;
alter table public.organizations add constraint organizations_slug_not_reserved check (slug not in (
  'admin', 'api', 'auth', 'kitchen', 'delivery', 'login', 'signup', 'reset-password', 'orders',
  'profile', 'settings', 'notifications', 'paiement', 'menu', 'categories', 'product', 'cart',
  'checkout', 'favorites', 'offers', 'help', 'tchopi', 'www', 'app', 'static', 'public'
));

alter table public.locations drop constraint if exists locations_slug_not_reserved;
alter table public.locations add constraint locations_slug_not_reserved check (slug not in (
  'menu', 'categories', 'product', 'cart', 'checkout', 'favorites', 'offers', 'help', 'manifest'
));

select slug, name from public.storefronts;
