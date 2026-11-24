-- VÉRIFICATIONS DE SÉCURITÉ (lecture seule, ne modifie rien). À exécuter dans Supabase > SQL Editor.
-- Exécute chaque bloc séparément et regarde le résultat.

-- A) Qui est admin ou marqueur aujourd'hui ? (tu dois reconnaître chaque ligne)
select p.email, r.role
from public.user_roles r
join public.profiles p on p.id = r.user_id
order by r.role, p.email;

-- B) Les règles d'accès sur la table des rôles. Attendu :
--    "own roles or admin read" (select), "admin insert roles" (insert), "admin delete roles" (delete). Rien d'autre.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'user_roles';

-- C) Les tables ont-elles bien la sécurité (RLS) activée ? Attendu : rowsecurity = true partout.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- D) Politiques trop permissives (écriture ouverte à tous). Attendu : aucune ligne.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT','UPDATE','DELETE','ALL')
  and (qual = 'true' or with_check = 'true');

-- E) Pour retirer un rôle à quelqu'un qui ne doit pas l'avoir (remplace l'e-mail) :
-- delete from public.user_roles
-- where user_id = (select id from public.profiles where email = 'email@exemple.com')
--   and role = 'admin';   -- ou 'marqueur'
