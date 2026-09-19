-- Activer l'extension UUID
create extension if not exists "uuid-ossp";

-- 1. PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email varchar not null,
  first_name varchar,
  last_name varchar,
  phone varchar,
  address text,
  role varchar default 'client', -- 'client', 'cuisinier', 'livreur', 'admin'
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PIZZAS
create table public.pizzas (
  id uuid default uuid_generate_v4() primary key,
  name varchar not null,
  description text,
  ingredients text[],
  price numeric(10,2) not null,
  image_url text,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. PRODUCTS (Menu général, accompagnements, boissons)
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  title varchar not null,
  description text,
  price numeric(10,2) not null,
  category varchar not null,
  image text,
  is_spicy boolean default false,
  rating numeric(3,2) default 0,
  reviews integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ORDERS
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  status varchar default 'en_attente', -- en_attente, preparation, en_livraison, livre, annule
  total_price numeric(10,2) not null,
  delivery_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. ORDER ITEMS
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  pizza_id uuid references public.pizzas(id), -- Ou product_id
  quantity integer not null default 1,
  unit_price numeric(10,2) not null
);

-- SECURITE ET POLITIQUES (RLS)
alter table public.profiles enable row level security;
alter table public.pizzas enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- (Policies basiques pour un nouveau projet)
create policy "Profils publics ou auth" on public.profiles for all using (true);
create policy "Pizzas lisibles par tous" on public.pizzas for select using (true);
create policy "Produits lisibles par tous" on public.products for select using (true);
create policy "Commandes pour tout le monde (à resécuriser)" on public.orders for all using (true);
create policy "Items de commandes ouverts (à resécuriser)" on public.order_items for all using (true);

-- ==========================================
-- TRIGGER POUR LA CREATION AUTOMATIQUE DU PROFIL
-- ==========================================

-- Créer une fonction qui insère automatiquement le profil
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id, 
    new.email, 
    'client'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Créer le trigger associé
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
