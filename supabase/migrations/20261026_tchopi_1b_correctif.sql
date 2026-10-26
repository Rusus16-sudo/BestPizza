-- =====================================================================
-- Tchopi, phase 1, étape 1b : CORRECTIF de l'étape 1
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Le déclencheur de transition lisait le point de vente (location_id) sur
-- toutes les tables, alors que seules les commandes en ont un. Résultat :
-- ajouter un plat, une offre ou un avis échouait avec
-- « record "new" has no field "location_id" ». Les commandes n'étaient pas touchées.
-- =====================================================================

create or replace function public.transition_default_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select id into new.organization_id from public.organizations where slug = 'best-pizza';
  end if;
  -- Deux conditions séparées : PL/pgSQL évaluerait new.location_id même pour
  -- une table qui n'a pas ce champ.
  if tg_table_name = 'orders' then
    if new.location_id is null then
      select id into new.location_id from public.locations
      where organization_id = new.organization_id
      order by created_at
      limit 1;
    end if;
  end if;
  return new;
end $$;

select 'correctif appliqué' as resultat;
