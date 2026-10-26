-- =====================================================================
-- Tchopi, phase 1, étape 2 : RETOUR ARRIÈRE
-- À n'exécuter QUE si l'étape 2 (20261026_tchopi_2_securite.sql) pose problème.
-- Remet les règles d'accès d'avant, fondées sur le rôle du profil.
-- Les tables et les données de l'étape 1 sont gardées : elles ne gênent pas.
-- =====================================================================

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select using (
  user_id = auth.uid()
  or public.is_manager()
  or public.current_user_role() = 'cuisinier'
  or (public.current_user_role() = 'livreur' and (driver_id = auth.uid() or (status = 'prete' and driver_id is null)))
);

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders for update
  using (
    public.is_manager()
    or public.current_user_role() = 'cuisinier'
    or (public.current_user_role() = 'livreur' and (driver_id = auth.uid() or (status = 'prete' and driver_id is null)))
  )
  with check (
    public.is_manager()
    or public.current_user_role() = 'cuisinier'
    or (public.current_user_role() = 'livreur' and driver_id = auth.uid())
  );

drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.is_manager()) with check (public.is_manager());

drop policy if exists offers_write on public.offers;
create policy offers_write on public.offers for all
  using (public.is_manager()) with check (public.is_manager());

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete
  using (user_id = auth.uid() or public.is_manager());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_manager());

drop policy if exists "Photos produits gérées par le gérant" on storage.objects;
create policy "Photos produits gérées par le gérant" on storage.objects for all
  using (bucket_id = 'products' and public.is_manager())
  with check (bucket_id = 'products' and public.is_manager());

-- Les avis reviennent au rattachement de l'étape 1
drop trigger if exists reviews_10_organization on public.reviews;
drop trigger if exists reviews_10_default_tenant on public.reviews;
create trigger reviews_10_default_tenant before insert on public.reviews
  for each row execute function public.transition_default_tenant();

drop trigger if exists profiles_sync_membership on public.profiles;

-- Règles des nouvelles tables : sans elles, seul le serveur les lit, comme après l'étape 1
drop policy if exists product_locations_select on public.product_locations;
drop policy if exists product_locations_write on public.product_locations;
drop policy if exists organizations_select on public.organizations;
drop policy if exists organizations_update on public.organizations;
drop policy if exists locations_select on public.locations;
drop policy if exists locations_write on public.locations;
drop policy if exists memberships_select on public.memberships;

select 'retour arrière effectué' as resultat;
