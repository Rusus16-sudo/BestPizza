-- =====================================================================
-- Best Pizza : paiement en ligne par Mobile Money (Notch Pay)
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
-- =====================================================================

alter table public.orders
  add column if not exists payment_method varchar default 'especes',
  add column if not exists payment_status varchar default 'a_la_livraison',
  add column if not exists payment_reference varchar,
  add column if not exists paid_at timestamp with time zone;

comment on column public.orders.payment_method is 'especes | mobile_money';
comment on column public.orders.payment_status is 'a_la_livraison | en_attente | paye | echec | annule';

-- Une commande payée en ligne attend son paiement avant d'aller en cuisine :
-- c'est le statut « paiement ».
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('paiement', 'en_attente', 'en_preparation', 'prete', 'en_route', 'livre', 'annule'));

-- Retrouver une commande depuis la référence renvoyée par Notch Pay
create unique index if not exists orders_payment_reference_idx
  on public.orders (payment_reference)
  where payment_reference is not null;

-- Le client voit sa commande en attente de paiement ; la cuisine, non :
-- ses requêtes ne portent que sur les statuts en_attente / en_preparation / prete.
