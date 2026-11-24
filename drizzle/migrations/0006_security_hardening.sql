-- SÉCURITÉ : durcissement de l'attribution des rôles (admin / marqueur).
-- À exécuter dans Supabase > SQL Editor APRÈS avoir lancé 0004 et 0005.
-- Exécute d'abord securite_verification.sql pour voir qui a quels rôles aujourd'hui.

-- 1) Seul le TOUT PREMIER compte de l'application peut devenir admin automatiquement.
--    Avant : n'importe quelle inscription devenait admin dès qu'il n'y avait plus d'admin en base,
--    et deux inscriptions simultanées pouvaient toutes les deux devenir admin.
--    Maintenant : verrou anti-simultanéité + il faut être l'unique profil existant ET qu'aucun admin n'existe.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('arenalive_first_admin'));

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  if (select count(*) from public.profiles) = 1
     and not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end; $$;

-- 2) Impossible de retirer le dernier admin (évite de bloquer l'accès à l'administration).
create or replace function public.protect_last_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin'
     and not exists (select 1 from public.user_roles where role = 'admin' and id <> old.id) then
    raise exception 'Impossible de retirer le dernier administrateur. Nomme d''abord un autre admin.';
  end if;
  return old;
end; $$;

drop trigger if exists protect_last_admin_trg on public.user_roles;
create trigger protect_last_admin_trg before delete on public.user_roles
  for each row execute function public.protect_last_admin();
