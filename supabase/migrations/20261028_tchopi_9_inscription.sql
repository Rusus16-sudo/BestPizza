-- =====================================================================
-- Tchopi, phase 5 (début) : un restaurant s'inscrit tout seul
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- La page tchopi.cm/creer permet à un restaurant de créer sa vitrine.
-- Ses adresses (et quelques autres, pour les pages à venir de Tchopi) ne
-- peuvent pas servir de nom de restaurant.
-- =====================================================================

alter table public.organizations drop constraint if exists organizations_slug_not_reserved;
alter table public.organizations add constraint organizations_slug_not_reserved check (slug not in (
  'admin', 'api', 'auth', 'kitchen', 'delivery', 'login', 'signup', 'reset-password', 'orders',
  'profile', 'settings', 'notifications', 'paiement', 'menu', 'categories', 'product', 'cart',
  'checkout', 'favorites', 'offers', 'help', 'tchopi', 'www', 'app', 'static', 'public',
  'creer', 'inscription', 'tarifs', 'aide', 'contact', 'cgu', 'confidentialite', 'blog', 'suivi'
));

-- VÉRIFICATION : les restaurants existants respectent toujours la règle
select slug, name from public.organizations order by created_at;
