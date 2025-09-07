-- Migration: add pending_name column to profiles

BEGIN;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS pending_name text;

COMMIT;
