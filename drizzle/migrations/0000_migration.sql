-- ===== ENUMS =====
create type public.app_role as enum ('admin', 'marqueur');
create type public.tournament_format as enum ('poules', 'elimination');
create type public.tournament_status as enum ('a_venir', 'en_cours', 'termine');
create type public.match_status as enum ('a_venir', 'en_cours', 'termine');
create type public.lineup_status as enum ('titulaire', 'remplacant', 'reserve');
create type public.event_type as enum (
  'debut_match','changement_periode','fin_match',
  'but','passe_decisive','carton_jaune','carton_rouge','hors_jeu','remplacement',
  'panier_1','panier_2','panier_3','faute_personnelle','faute_technique','passe','steal','block','rebond','exclusion'
);

-- ===== PROFILES & ROLES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile or admin read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "own roles or admin read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admin insert roles" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "admin delete roles" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- First user becomes admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== SPORTS =====
create table public.sports (
  id text primary key,
  name text not null,
  periods int not null,
  period_label text not null
);
grant select on public.sports to anon, authenticated;
grant all on public.sports to service_role;
alter table public.sports enable row level security;
create policy "public read sports" on public.sports for select to anon, authenticated using (true);
insert into public.sports values ('football','Football',2,'Mi-temps'),('basketball','Basketball',4,'Quart-temps');

-- ===== TOURNAMENTS =====
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport_id text not null references public.sports(id),
  format public.tournament_format not null default 'poules',
  start_date date,
  end_date date,
  status public.tournament_status not null default 'a_venir',
  created_at timestamptz not null default now()
);
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  short_name text,
  logo_url text,
  color text not null default '#22c55e',
  group_name text,
  created_at timestamptz not null default now()
);
create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  jersey_number int,
  position text,
  photo_url text,
  created_at timestamptz not null default now()
);
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_a_id uuid not null references public.teams(id) on delete cascade,
  team_b_id uuid not null references public.teams(id) on delete cascade,
  scheduled_at timestamptz,
  phase text not null default 'Poule',
  group_name text,
  venue text,
  scorer_id uuid references public.profiles(id) on delete set null,
  status public.match_status not null default 'a_venir',
  current_period int not null default 0,
  score_a int not null default 0,
  score_b int not null default 0,
  started_at timestamptz,
  period_started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (team_a_id <> team_b_id)
);
create table public.lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status public.lineup_status not null default 'titulaire',
  position text,
  is_captain boolean not null default false,
  unique (match_id, player_id)
);
create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  related_player_id uuid references public.players(id) on delete set null,
  type public.event_type not null,
  minute int,
  period int,
  auto_generated boolean not null default false,
  source_event_id uuid references public.match_events(id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.teams(tournament_id);
create index on public.players(team_id);
create index on public.matches(tournament_id);
create index on public.lineups(match_id);
create index on public.match_events(match_id, created_at);

grant select on public.tournaments, public.teams, public.players, public.matches, public.lineups, public.match_events to anon, authenticated;
grant insert, update, delete on public.tournaments, public.teams, public.players, public.lineups to authenticated;
grant insert, delete on public.matches, public.match_events to authenticated;
-- scores/status/period are computed: never updatable by clients
grant update (tournament_id, team_a_id, team_b_id, scheduled_at, phase, group_name, venue, scorer_id) on public.matches to authenticated;
grant all on public.tournaments, public.teams, public.players, public.matches, public.lineups, public.match_events to service_role;

alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.lineups enable row level security;
alter table public.match_events enable row level security;

create policy "public read" on public.tournaments for select to anon, authenticated using (true);
create policy "public read" on public.teams for select to anon, authenticated using (true);
create policy "public read" on public.players for select to anon, authenticated using (true);
create policy "public read" on public.matches for select to anon, authenticated using (true);
create policy "public read" on public.lineups for select to anon, authenticated using (true);
create policy "public read" on public.match_events for select to anon, authenticated using (true);

create policy "admin write" on public.tournaments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.teams for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.players for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.matches for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.lineups for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.match_events for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.is_match_scorer(_match_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matches m where m.id = _match_id and m.scorer_id = auth.uid())
    and public.has_role(auth.uid(), 'marqueur')
$$;
create policy "scorer insert events" on public.match_events for insert to authenticated
  with check (public.is_match_scorer(match_id) and auto_generated = false);
create policy "scorer delete events" on public.match_events for delete to authenticated
  using (public.is_match_scorer(match_id));

-- ===== COMPUTED MATCH STATE =====
create or replace function public.recompute_match(_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m record; sport text; sa int; sb int; st public.match_status; per int;
  t_start timestamptz; t_end timestamptz; t_per timestamptz;
begin
  select * into m from public.matches where id = _match_id;
  if not found then return; end if;
  select t.sport_id into sport from public.tournaments t where t.id = m.tournament_id;

  if sport = 'basketball' then
    select coalesce(sum(case type when 'panier_1' then 1 when 'panier_2' then 2 when 'panier_3' then 3 else 0 end) filter (where team_id = m.team_a_id),0),
           coalesce(sum(case type when 'panier_1' then 1 when 'panier_2' then 2 when 'panier_3' then 3 else 0 end) filter (where team_id = m.team_b_id),0)
      into sa, sb from public.match_events where match_id = _match_id;
  else
    select count(*) filter (where type='but' and team_id = m.team_a_id),
           count(*) filter (where type='but' and team_id = m.team_b_id)
      into sa, sb from public.match_events where match_id = _match_id;
  end if;

  select min(created_at) filter (where type='debut_match'),
         max(created_at) filter (where type='fin_match'),
         count(*) filter (where type='changement_periode')
    into t_start, t_end, per from public.match_events where match_id = _match_id;
  select max(created_at) into t_per from public.match_events
    where match_id = _match_id and type in ('debut_match','changement_periode');

  if t_end is not null then st := 'termine';
  elsif t_start is not null then st := 'en_cours';
  else st := 'a_venir'; end if;

  update public.matches set score_a = sa, score_b = sb, status = st,
    current_period = case when t_start is null then 0 else per + 1 end,
    started_at = t_start, ended_at = t_end, period_started_at = t_per
  where id = _match_id;
end; $$;

create or replace function public.on_match_event_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ev public.match_events; cnt int;
begin
  ev := coalesce(new, old);

  if tg_op = 'INSERT' and new.player_id is not null and not new.auto_generated then
    -- Foot : 2 jaunes = rouge automatique
    if new.type = 'carton_jaune' then
      select count(*) into cnt from public.match_events
        where match_id = new.match_id and player_id = new.player_id and type = 'carton_jaune';
      if cnt = 2 then
        insert into public.match_events(match_id, team_id, player_id, type, minute, period, auto_generated, source_event_id)
        values (new.match_id, new.team_id, new.player_id, 'carton_rouge', new.minute, new.period, true, new.id);
      end if;
    end if;
    -- Basket : 5 fautes personnelles = exclusion
    if new.type = 'faute_personnelle' then
      select count(*) into cnt from public.match_events
        where match_id = new.match_id and player_id = new.player_id and type = 'faute_personnelle';
      if cnt = 5 then
        insert into public.match_events(match_id, team_id, player_id, type, minute, period, auto_generated, source_event_id)
        values (new.match_id, new.team_id, new.player_id, 'exclusion', new.minute, new.period, true, new.id);
      end if;
    end if;
  end if;

  perform public.recompute_match(ev.match_id);
  return null;
end; $$;
create trigger match_events_after after insert or delete on public.match_events
  for each row execute function public.on_match_event_change();

-- Fill period automatically if missing
create or replace function public.match_event_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.period is null then
    select current_period into new.period from public.matches where id = new.match_id;
  end if;
  if new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end; $$;
create trigger match_events_before before insert on public.match_events
  for each row execute function public.match_event_defaults();

-- ===== REALTIME =====
alter publication supabase_realtime add table public.match_events;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.lineups;

-- ===== DEMO DATA =====
insert into public.tournaments (id, name, sport_id, format, start_date, end_date, status) values
 ('a0000000-0000-0000-0000-000000000001','Coupe du Lycée — Football','football','poules', current_date - 3, current_date + 10,'en_cours'),
 ('a0000000-0000-0000-0000-000000000002','Tournoi Inter-classes — Basket','basketball','elimination', current_date - 1, current_date + 5,'en_cours');

insert into public.teams (id, tournament_id, name, short_name, color, group_name) values
 ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Les Lions','LIO','#f59e0b','A'),
 ('a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','Étoile Rouge','ETR','#ef4444','A'),
 ('a1000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','Atlas FC','ATL','#3b82f6','A'),
 ('a1000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','Les Panthères','PAN','#a855f7','A'),
 ('a2000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','Terminale A','TLA','#06b6d4',null),
 ('a2000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','Première B','PRB','#f97316',null),
 ('a2000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002','Seconde C','SEC','#84cc16',null),
 ('a2000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002','Profs United','PRO','#e11d48',null);

-- 8 players per team
with fn as (select array['Kofi','Yanis','Ibrahim','Lucas','Moussa','Hugo','Sékou','Noah','Adam','Ilyes','Théo','Rayan','Malik','Enzo','Bilal','Nathan'] a),
     ln as (select array['Mensah','Diallo','Traoré','Martin','Koné','Bernard','Dossou','Petit','Hounkpè','Robert','Agbo','Durand','Sow','Leroy','Ahouandjinou','Moreau'] a),
     fpos as (select array['GB','DEF','DEF','MIL','ATT','MIL','DEF','ATT'] a),
     bpos as (select array['Meneur','Arrière','Ailier','Ailier fort','Pivot','Arrière','Ailier','Pivot'] a)
insert into public.players (team_id, name, jersey_number, position)
select t.id,
  fn.a[1 + ((row_number() over () * 7 + i * 3) % 16)::int] || ' ' || ln.a[1 + ((row_number() over () * 5 + i) % 16)::int],
  case when t.tournament_id = 'a0000000-0000-0000-0000-000000000001' then (array[1,4,5,8,9,10,3,11])[i] else (array[4,7,10,12,15,6,9,14])[i] end,
  case when t.tournament_id = 'a0000000-0000-0000-0000-000000000001' then fpos.a[i] else bpos.a[i] end
from public.teams t cross join generate_series(1,8) i, fn, ln, fpos, bpos;

-- Matches football (poule A)
insert into public.matches (id, tournament_id, team_a_id, team_b_id, scheduled_at, phase, group_name, venue) values
 ('a3000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002', now() - interval '2 days','Poule','A','Terrain principal'),
 ('a3000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004', now() - interval '2 days' + interval '1 hour','Poule','A','Terrain principal'),
 ('a3000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003', now() - interval '20 minutes','Poule','A','Terrain principal'),
 ('a3000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000004', now() + interval '1 day','Poule','A','Terrain annexe'),
 ('a3000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004', now() + interval '3 days','Poule','A','Terrain principal'),
 ('a3000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003', now() + interval '3 days' + interval '1 hour','Poule','A','Terrain principal'),
-- Basket (élimination directe)
 ('a4000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002', now() - interval '1 day','Demi-finale',null,'Gymnase'),
 ('a4000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000004', now() + interval '2 hours','Demi-finale',null,'Gymnase');

-- Lineups for every demo match: 5 titulaires, 2 remplaçants, 1 réserve, capitaine = n°1 dans l'ordre
insert into public.lineups (match_id, player_id, team_id, status, position, is_captain)
select m.id, p.id, p.team_id,
  case when p.rn <= 5 then 'titulaire'::public.lineup_status when p.rn <= 7 then 'remplacant' else 'reserve' end,
  p.position, p.rn = 2
from public.matches m
join (select pl.*, row_number() over (partition by team_id order by created_at, jersey_number) rn from public.players pl) p
  on p.team_id in (m.team_a_id, m.team_b_id);

-- Events helper: player by team + jersey
create or replace function public._demo_p(_team uuid, _num int) returns uuid language sql as $$
  select id from public.players where team_id = _team and jersey_number = _num limit 1 $$;

-- Match 1: Lions 2 - 1 Étoile Rouge (terminé)
insert into public.match_events (match_id, team_id, player_id, type, minute, created_at) values
 ('a3000000-0000-0000-0000-000000000001', null, null, 'debut_match', 0, now() - interval '2 days'),
 ('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001', public._demo_p('a1000000-0000-0000-0000-000000000001',9),'but',12, now() - interval '2 days' + interval '12 min'),
 ('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002', public._demo_p('a1000000-0000-0000-0000-000000000002',5),'carton_jaune',18, now() - interval '2 days' + interval '18 min'),
 ('a3000000-0000-0000-0000-000000000001', null, null, 'changement_periode', 25, now() - interval '2 days' + interval '25 min'),
 ('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002', public._demo_p('a1000000-0000-0000-0000-000000000002',10),'but',31, now() - interval '2 days' + interval '35 min'),
 ('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001', public._demo_p('a1000000-0000-0000-0000-000000000001',10),'but',44, now() - interval '2 days' + interval '48 min'),
 ('a3000000-0000-0000-0000-000000000001', null, null, 'fin_match', 50, now() - interval '2 days' + interval '55 min');
-- Match 2: Atlas 0 - 0 Panthères (terminé)
insert into public.match_events (match_id, team_id, player_id, type, minute, created_at) values
 ('a3000000-0000-0000-0000-000000000002', null, null, 'debut_match', 0, now() - interval '2 days' + interval '1 hour'),
 ('a3000000-0000-0000-0000-000000000002', null, null, 'changement_periode', 25, now() - interval '2 days' + interval '85 min'),
 ('a3000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000004', public._demo_p('a1000000-0000-0000-0000-000000000004',4),'carton_jaune',33, now() - interval '2 days' + interval '95 min'),
 ('a3000000-0000-0000-0000-000000000002', null, null, 'fin_match', 50, now() - interval '2 days' + interval '115 min');
-- Match 3: Lions vs Atlas EN DIRECT
insert into public.match_events (match_id, team_id, player_id, type, minute, created_at) values
 ('a3000000-0000-0000-0000-000000000003', null, null, 'debut_match', 0, now() - interval '20 minutes'),
 ('a3000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000003', public._demo_p('a1000000-0000-0000-0000-000000000003',11),'but',8, now() - interval '12 minutes'),
 ('a3000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001', public._demo_p('a1000000-0000-0000-0000-000000000001',4),'carton_jaune',14, now() - interval '6 minutes');
-- Basket demi 1: terminé
insert into public.match_events (match_id, team_id, player_id, type, minute, created_at)
select 'a4000000-0000-0000-0000-000000000001', null, null, 'debut_match', 0, now() - interval '1 day';
insert into public.match_events (match_id, team_id, player_id, type, minute, created_at)
select 'a4000000-0000-0000-0000-000000000001',
  case when g % 2 = 0 then 'a2000000-0000-0000-0000-000000000001'::uuid else 'a2000000-0000-0000-0000-000000000002'::uuid end,
  public._demo_p(case when g % 2 = 0 then 'a2000000-0000-0000-0000-000000000001'::uuid else 'a2000000-0000-0000-0000-000000000002'::uuid end, (array[4,7,10,12,15])[1 + g % 5]),
  (array['panier_2','panier_3','panier_2','panier_1','panier_2','faute_personnelle','rebond'])[1 + g % 7]::public.event_type,
  g / 3, now() - interval '1 day' + (g || ' minutes')::interval
from generate_series(1, 40) g;
insert into public.match_events (match_id, type, minute, created_at) values
 ('a4000000-0000-0000-0000-000000000001','fin_match',40, now() - interval '1 day' + interval '50 minutes');
drop function public._demo_p(uuid, int);
