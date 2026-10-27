-- =====================================================================
-- Tchopi, phase 2, étape 2.2 : commander sans compte
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Un client peut commander avec son nom, son téléphone et son adresse.
-- Il suit sa commande grâce à un lien secret (tchopi.cm/<restaurant>/suivi/<jeton>),
-- et peut recevoir les notifications sans avoir de compte. S'il en crée un
-- ensuite, sa commande y est rattachée.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Le jeton secret du lien de suivi : 32 caractères impossibles à deviner.
--    Chaque commande existante en reçoit un.
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists tracking_token text not null default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists orders_tracking_token_idx on public.orders (tracking_token);

comment on column public.orders.tracking_token is
  'Secret du lien de suivi. Le connaître suffit pour voir la commande : ne jamais l''afficher à quelqu''un d''autre que le client.';

-- ---------------------------------------------------------------------
-- 2. Un téléphone peut être abonné aux notifications d'une commande,
--    sans compte (client sans compte), ou à celles d'un compte
-- ---------------------------------------------------------------------
alter table public.push_subscriptions alter column user_id drop not null;
alter table public.push_subscriptions
  add column if not exists order_id uuid references public.orders (id) on delete cascade;

alter table public.push_subscriptions drop constraint if exists push_subscriptions_owner_check;
alter table public.push_subscriptions add constraint push_subscriptions_owner_check
  check (user_id is not null or order_id is not null);

create index if not exists push_subscriptions_order_idx on public.push_subscriptions (order_id);

-- ---------------------------------------------------------------------
-- 3. « suivi » est une page de la vitrine : aucun point de vente ne peut s'appeler ainsi
-- ---------------------------------------------------------------------
alter table public.locations drop constraint if exists locations_slug_not_reserved;
alter table public.locations add constraint locations_slug_not_reserved check (slug not in (
  'menu', 'categories', 'product', 'cart', 'checkout', 'favorites', 'offers', 'help', 'manifest', 'suivi'
));

-- ---------------------------------------------------------------------
-- VÉRIFICATION : chaque commande a son lien de suivi (doit afficher 0)
-- ---------------------------------------------------------------------
select 'commandes sans lien de suivi' as controle, count(*) from public.orders where tracking_token is null or length(tracking_token) <> 32;
