-- =====================================================================
-- Tchopi : les problèmes de livraison
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- 1. Le livreur signale un problème (client injoignable, absent, adresse
--    introuvable) : le gérant et le client sont prévenus.
-- 2. Quand une commande n'est plus en route (livrée, annulée, ou retirée au
--    livreur par le gérant), la position du livreur pour elle est effacée.
-- =====================================================================

alter table public.orders
  add column if not exists delivery_issue text
    check (delivery_issue is null or delivery_issue in ('injoignable', 'absent', 'adresse')),
  add column if not exists delivery_issue_at timestamp with time zone;

create or replace function public.clear_driver_position()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'en_route' and new.status is distinct from 'en_route' then
    delete from public.driver_positions where order_id = new.id;
    -- Le problème signalé concernait cette livraison-là
    new.delivery_issue := null;
    new.delivery_issue_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_driver_position on public.orders;
create trigger clear_driver_position
  before update on public.orders
  for each row execute function public.clear_driver_position();

select 'problèmes de livraison prêts' as resultat;
