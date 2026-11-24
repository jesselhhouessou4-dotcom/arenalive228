-- ÉTAPE 2/2 : règles de score et d'exclusion pour les nouveaux événements.
-- À exécuter APRÈS 0004_new_event_types.sql.

-- 1) Score : le but contre son camp compte pour l'ADVERSAIRE de l'équipe indiquée dans team_id.
--    (reprend exactement recompute_match de 0000_migration.sql, seule la branche football change)
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
    select count(*) filter (where (type = 'but' and team_id = m.team_a_id)
                               or (type = 'but_contre_son_camp' and team_id = m.team_b_id)),
           count(*) filter (where (type = 'but' and team_id = m.team_b_id)
                               or (type = 'but_contre_son_camp' and team_id = m.team_a_id))
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

-- 2) Exclusions automatiques (règles FIBA pour le basket).
--    - Football : 2 jaunes = rouge (inchangé).
--    - Basket : 5 fautes parmi personnelle / technique / offensive / antisportive = exclusion.
--    - Basket : faute disqualifiante = exclusion immédiate.
--    - faute_technique_coach n'a pas de joueur : elle est ignorée ici.
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

    -- Basket : 5 fautes (personnelle, technique, offensive, antisportive) = exclusion
    if new.type in ('faute_personnelle','faute_technique','faute_offensive','faute_antisportive') then
      select count(*) into cnt from public.match_events
        where match_id = new.match_id and player_id = new.player_id
          and type in ('faute_personnelle','faute_technique','faute_offensive','faute_antisportive');
      if cnt = 5 then
        insert into public.match_events(match_id, team_id, player_id, type, minute, period, auto_generated, source_event_id)
        values (new.match_id, new.team_id, new.player_id, 'exclusion', new.minute, new.period, true, new.id);
      end if;
    end if;

    -- Basket : faute disqualifiante = exclusion immédiate (sauf si déjà exclu)
    if new.type = 'faute_disqualifiante' then
      if not exists (select 1 from public.match_events
                     where match_id = new.match_id and player_id = new.player_id and type = 'exclusion') then
        insert into public.match_events(match_id, team_id, player_id, type, minute, period, auto_generated, source_event_id)
        values (new.match_id, new.team_id, new.player_id, 'exclusion', new.minute, new.period, true, new.id);
      end if;
    end if;
  end if;

  perform public.recompute_match(ev.match_id);
  return null;
end; $$;
