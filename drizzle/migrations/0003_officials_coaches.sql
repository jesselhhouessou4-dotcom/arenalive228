ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS officials jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS coach text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS assistant_coach text;