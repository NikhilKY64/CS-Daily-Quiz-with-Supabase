-- Enable Row Level Security and add policies for asked_questions
-- Allow only admin users (profiles.is_admin = true) to DELETE from asked_questions (for import/replace)
-- Allow users to SELECT/INSERT their own rows

ALTER TABLE public.asked_questions ENABLE ROW LEVEL SECURITY;


-- Allow users to SELECT their own asked_questions
DROP POLICY IF EXISTS "Select own asked_questions" ON public.asked_questions;
CREATE POLICY "Select own asked_questions" ON public.asked_questions
  FOR SELECT
  USING (auth.uid() = user_id);


-- Allow users to INSERT their own asked_questions
DROP POLICY IF EXISTS "Insert own asked_questions" ON public.asked_questions;
CREATE POLICY "Insert own asked_questions" ON public.asked_questions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);



-- Allow any authenticated user to DELETE any asked_questions (for import/replace)
DROP POLICY IF EXISTS "Any user delete asked_questions" ON public.asked_questions;
CREATE POLICY "Any user delete asked_questions" ON public.asked_questions
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Optionally, allow users to DELETE their own rows (if needed)
-- CREATE POLICY "Delete own asked_questions" ON public.asked_questions
--   FOR DELETE
--   USING (auth.uid() = user_id);
