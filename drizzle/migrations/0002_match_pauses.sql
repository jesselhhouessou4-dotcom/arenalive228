ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS pause_reason text,
  ADD COLUMN IF NOT EXISTS total_paused_seconds integer NOT NULL DEFAULT 0;

CREATE TABLE public.match_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('mi_temps','temps_mort','blessure','autre')),
  period integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  resumed_at timestamptz,
  duration_seconds integer,
  created_by uuid,
  created_by_name text
);
CREATE INDEX match_pauses_match_idx ON public.match_pauses(match_id, started_at);
GRANT SELECT ON public.match_pauses TO anon, authenticated;
GRANT ALL ON public.match_pauses TO service_role;
ALTER TABLE public.match_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pauses" ON public.match_pauses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage pauses" ON public.match_pauses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.close_open_pause(_match_id uuid, _at timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare d int := 0;
begin
  update public.match_pauses
     set resumed_at = _at, duration_seconds = greatest(0, extract(epoch from (_at - started_at))::int)
   where match_id = _match_id and resumed_at is null
   returning duration_seconds into d;
  return coalesce(d, 0);
end $$;
REVOKE EXECUTE ON FUNCTION public.close_open_pause(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.pause_match(_match_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare m public.matches; who text;
begin
  if auth.uid() is null or not (public.has_role(auth.uid(),'admin') or public.is_match_scorer(_match_id)) then
    raise exception 'Action non autorisée pour votre rôle.';
  end if;
  if _reason not in ('mi_temps','temps_mort','blessure','autre') then raise exception 'Motif invalide.'; end if;
  select * into m from public.matches where id = _match_id for update;
  if m.status <> 'en_cours' then raise exception 'Le match n''est pas en cours.'; end if;
  if m.is_paused then raise exception 'Le chrono est déjà en pause.'; end if;
  select coalesce(display_name, email) into who from public.profiles where id = auth.uid();
  update public.matches set is_paused = true, paused_at = now(), pause_reason = _reason where id = _match_id;
  insert into public.match_pauses(match_id, reason, period, started_at, created_by, created_by_name)
  values (_match_id, _reason, m.current_period, now(), auth.uid(), who);
end $$;

CREATE OR REPLACE FUNCTION public.resume_match(_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare m public.matches; d int;
begin
  if auth.uid() is null or not (public.has_role(auth.uid(),'admin') or public.is_match_scorer(_match_id)) then
    raise exception 'Action non autorisée pour votre rôle.';
  end if;
  select * into m from public.matches where id = _match_id for update;
  if not m.is_paused then raise exception 'Le chrono n''est pas en pause.'; end if;
  d := greatest(0, extract(epoch from (now() - m.paused_at))::int);
  perform public.close_open_pause(_match_id, now());
  update public.matches set is_paused = false, paused_at = null, pause_reason = null,
    total_paused_seconds = total_paused_seconds + d where id = _match_id;
end $$;
REVOKE EXECUTE ON FUNCTION public.pause_match(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resume_match(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pause_match(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_match(uuid) TO authenticated;

-- Nouvelle période ou fin de match : on clôt la pause et on remet le cumul à zéro.
CREATE OR REPLACE FUNCTION public.match_pause_reset()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.period_started_at is distinct from old.period_started_at
     or (new.status = 'termine' and old.status <> 'termine') then
    if old.is_paused then perform public.close_open_pause(new.id, now()); end if;
    new.is_paused := false; new.paused_at := null; new.pause_reason := null;
    if new.period_started_at is distinct from old.period_started_at then new.total_paused_seconds := 0; end if;
  end if;
  return new;
end $$;
CREATE TRIGGER match_pause_reset BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.match_pause_reset();

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_pauses;