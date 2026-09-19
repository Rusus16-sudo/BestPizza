-- =====================================================================
-- Best Pizza : chaque compte (email ou Google) reçoit automatiquement
-- un profil « client », avec son prénom quand il est connu.
-- Rattrape aussi les comptes créés sans profil.
-- À exécuter une fois dans Supabase > SQL Editor (peut être relancé).
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, role)
  values (
    new.id,
    new.email,
    nullif(split_part(coalesce(
      new.raw_user_meta_data->>'first_name',   -- inscription par email
      new.raw_user_meta_data->>'full_name',    -- Google
      new.raw_user_meta_data->>'name',
      ''), ' ', 1), ''),
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Rattrapage : comptes existants sans profil
insert into public.profiles (id, email, first_name, role)
select
  u.id,
  u.email,
  nullif(split_part(coalesce(
    u.raw_user_meta_data->>'first_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    ''), ' ', 1), ''),
  'client'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Prénom manquant sur un profil existant, alors qu'il est connu du compte
update public.profiles p
set first_name = nullif(split_part(coalesce(
      u.raw_user_meta_data->>'first_name',
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      ''), ' ', 1), '')
from auth.users u
where u.id = p.id
  and coalesce(p.first_name, '') = ''
  and coalesce(
        u.raw_user_meta_data->>'first_name',
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        '') <> '';
