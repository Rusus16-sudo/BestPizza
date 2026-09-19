-- Importe la carte de démonstration (src/data/products.js) dans la table products.
-- À exécuter APRÈS la migration 20260919_aligner_base_et_securite.sql.
-- Un plat déjà présent (même titre) n'est pas réimporté.

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Margherita', 'Un délice classique avec 100% de vraie mozzarella, du basilic frais et notre sauce tomate signature sur une pâte croustillante.', 4500, 'Pizza', '/margherita.png', false, '25-35 min', '[{"id":"extra_cheese","label":"Supplément Fromage","price":1000},{"id":"cheesy_crust","label":"Pâte Fourrée Fromage","price":1500}]'::jsonb
where not exists (select 1 from public.products where title = 'Margherita');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Pepperoni Épicée', 'Pepperoni croustillant et épicé avec de la mozzarella fraîche, des tomates écrasées et un filet de miel pimenté sur notre pâte spéciale.', 6500, 'Pizza', '/promo-pizza.png', true, '25-35 min', '[{"id":"extra_cheese","label":"Supplément Fromage","price":1000},{"id":"jalapenos","label":"Ajouter Jalapenos","price":500},{"id":"extra_pepperoni","label":"Extra Pepperoni","price":1500}]'::jsonb
where not exists (select 1 from public.products where title = 'Pepperoni Épicée');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select '4 Fromages', 'Un mélange divin de Mozzarella, Gorgonzola, Parmesan et Fontina, idéal pour les amoureux de fromage.', 7500, 'Pizza', '/four_cheeses.png', false, '25-35 min', '[{"id":"truffle_oil","label":"Huile de Truffe","price":1000},{"id":"cheesy_crust","label":"Pâte Fourrée Fromage","price":1500}]'::jsonb
where not exists (select 1 from public.products where title = '4 Fromages');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Végétarienne Suprême', 'Garnie de poivrons colorés, oignons doux, olives noires et champignons frais sur un lit de mozzarella.', 5500, 'Pizza', '/veggie_supreme.png', false, '25-35 min', '[{"id":"extra_cheese","label":"Supplément Fromage","price":1000},{"id":"vegan_cheese","label":"Fromage Vegan","price":1500},{"id":"jalapenos","label":"Ajouter Jalapenos","price":500}]'::jsonb
where not exists (select 1 from public.products where title = 'Végétarienne Suprême');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Ailes de Poulet BBQ', 'De délicieuses ailes de poulet rôties, enrobées de notre sauce barbecue maison fumée.', 3500, 'Sides', 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=400', false, '25-35 min', '[{"id":"extra_sauce","label":"Sauce BBQ Supplémentaire","price":500}]'::jsonb
where not exists (select 1 from public.products where title = 'Ailes de Poulet BBQ');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Frites de Patate Douce', 'Des frites de patate douce croustillantes à l''extérieur et fondantes à l''intérieur.', 2500, 'Sides', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400', false, '25-35 min', '[{"id":"spicy_mayo","label":"Mayonnaise Épicée","price":500}]'::jsonb
where not exists (select 1 from public.products where title = 'Frites de Patate Douce');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Coca-Cola Frais', 'Un Coca-Cola bien glacé pour accompagner votre repas.', 1500, 'Drinks', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400', false, '25-35 min', '[]'::jsonb
where not exists (select 1 from public.products where title = 'Coca-Cola Frais');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Thé Glacé Maison', 'Thé glacé maison infusé au citron et à la menthe fraîche.', 2000, 'Drinks', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400', false, '25-35 min', '[]'::jsonb
where not exists (select 1 from public.products where title = 'Thé Glacé Maison');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Double Smash Burger', 'Deux steaks hachés pur boeuf caramélisés, double cheddar affiné, cornichons, oignons fondants et notre sauce secrète Best Pizza.', 6000, 'Burgers', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400', false, '25-35 min', '[{"id":"bacon","label":"Bacon Fumé","price":1000},{"id":"extra_steak","label":"Steak Supplémentaire","price":1500}]'::jsonb
where not exists (select 1 from public.products where title = 'Double Smash Burger');

insert into public.products (title, description, price, category, image, is_spicy, prep_time, customizations)
select 'Tiramisu Maison', 'Le véritable Tiramisu italien avec mascarpone frais, biscuit cuillère imbibé de café expresso et cacao amer.', 3500, 'Desserts', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=400', false, '25-35 min', '[]'::jsonb
where not exists (select 1 from public.products where title = 'Tiramisu Maison');

