-- ÉTAPE 1/2 : nouveaux types d'événements.
-- À exécuter SEULE (une fois) : PostgreSQL interdit d'utiliser une nouvelle valeur d'enum
-- dans la même transaction que celle qui l'ajoute. Exécute ensuite 0005_event_rules.sql.

-- Football
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'faute';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'faute_main';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'coup_franc';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'corner';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'touche';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'penalty_accorde';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'penalty_manque';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'but_contre_son_camp';

-- Basket
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'faute_offensive';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'faute_antisportive';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'faute_disqualifiante';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'faute_technique_coach';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'perte_balle';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'temps_mort';
