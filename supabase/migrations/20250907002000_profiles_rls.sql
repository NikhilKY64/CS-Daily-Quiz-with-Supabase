-- Migration: profiles RLS and admin flags

BEGIN;

-- 1) Add admin flag if missing
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2) Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Allow public SELECT so UI can read profiles (change TO authenticated if you prefer)
CREATE POLICY select_profiles_public
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- 4) Allow authenticated users to INSERT their own profile
CREATE POLICY insert_own_profile
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ( id = auth.uid() );

CREATE POLICY update_own_pending_only
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ( id = auth.uid() )
  WITH CHECK (
    id = auth.uid()
  AND name = (SELECT name FROM public.profiles WHERE id = auth.uid())
  );

-- 6) Allow admins to UPDATE any profile (approve/reject)
CREATE POLICY admins_update_any
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ( (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true )
  WITH CHECK ( (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true );

COMMIT;
