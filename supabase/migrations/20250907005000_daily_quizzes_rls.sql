-- Enable Row Level Security and add policies for daily_quizzes
-- - Allow anyone to SELECT (so clients can read today's canonical quiz)
-- - Allow only admin users (profiles.is_admin = true) to INSERT/UPDATE/DELETE

ALTER TABLE public.daily_quizzes ENABLE ROW LEVEL SECURITY;

-- Allow public SELECT so clients can fetch today's quiz without auth restrictions
CREATE POLICY "Public select daily quizzes" ON public.daily_quizzes
  FOR SELECT
  USING (true);

-- Allow INSERT only for admin users (profiles.is_admin = true)
CREATE POLICY "Insert by admin only" ON public.daily_quizzes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Allow UPDATE only for admin users
CREATE POLICY "Update by admin only" ON public.daily_quizzes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Allow DELETE only for admin users
CREATE POLICY "Delete by admin only" ON public.daily_quizzes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Notes:
-- 1) Service role (server) bypasses RLS. Use service_role for server-side management tasks.
-- 2) If you want authenticated users (non-admins) to be able to INSERT (e.g., create quizzes), adjust the INSERT policy accordingly.
