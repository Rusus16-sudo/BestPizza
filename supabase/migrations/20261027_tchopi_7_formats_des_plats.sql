-- =====================================================================
-- Tchopi, phase 2, étape 2.4 : des choix propres à chaque plat
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque).
--
-- Les tailles de pizza étaient écrites dans le code, pour tous les restaurants.
-- Chaque plat a maintenant ses propres choix, définis par le gérant :
--   option_groups = [
--     { "id": "taille", "name": "Taille", "type": "single",
--       "choices": [{ "id": "moyenne", "label": "Moyenne", "price": 0 }, …] },
--     { "id": "supplements", "name": "Suppléments", "type": "multiple",
--       "choices": [{ "id": "bacon", "label": "Bacon fumé", "price": 1000 }] }
--   ]
--   single   : le client en choisit un (taille, formule…)
--   multiple : le client en coche autant qu'il veut, ou aucun (suppléments)
--   price    : ce que le choix ajoute au prix du plat
-- =====================================================================

alter table public.products
  add column if not exists option_groups jsonb not null default '[]'::jsonb;

comment on column public.products.option_groups is
  'Choix du plat : [{id, name, type: single|multiple, choices: [{id, label, price}]}]. price = supplément.';

-- Ce que le client a choisi, ligne par ligne, tel quel au moment de la commande
alter table public.order_items
  add column if not exists options jsonb not null default '[]'::jsonb;

comment on column public.order_items.options is
  'Choix retenus : [{group_id, group, choice_id, label, price}], pour la cuisine et le suivi.';

-- ---------------------------------------------------------------------
-- Les plats existants gardent exactement leurs prix :
-- - les pizzas reçoivent les tailles qui étaient dans le code ;
-- - les suppléments existants deviennent le choix « Suppléments ».
-- Seulement pour les plats qui n'ont encore aucun choix.
-- ---------------------------------------------------------------------
update public.products p
set option_groups =
  (case when lower(p.category) in ('pizza', 'pizzas') then jsonb_build_array(jsonb_build_object(
      'id', 'taille', 'name', 'Taille', 'type', 'single',
      'choices', '[{"id":"moyenne","label":"Moyenne","price":0},{"id":"grande","label":"Grande","price":1000},{"id":"extra-grande","label":"Extra Grande","price":2000}]'::jsonb))
   else '[]'::jsonb end)
  ||
  (case when jsonb_array_length(coalesce(p.customizations, '[]'::jsonb)) > 0 then jsonb_build_array(jsonb_build_object(
      'id', 'supplements', 'name', 'Suppléments', 'type', 'multiple',
      'choices', (select jsonb_agg(jsonb_build_object('id', c->>'id', 'label', c->>'label', 'price', coalesce((c->>'price')::numeric, 0)))
                  from jsonb_array_elements(p.customizations) c)))
   else '[]'::jsonb end)
where p.option_groups = '[]'::jsonb;

-- VÉRIFICATION : les choix de chaque plat
select title, category, jsonb_array_length(option_groups) as nombre_de_choix,
       (select string_agg(g->>'name', ', ') from jsonb_array_elements(option_groups) g) as choix
from public.products
order by category, title;
