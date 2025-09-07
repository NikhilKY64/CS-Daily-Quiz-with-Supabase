-- Add available_at timestamptz column to daily_quizzes so we can control when a quiz becomes available
ALTER TABLE public.daily_quizzes
  ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_daily_quizzes_available_at ON public.daily_quizzes (available_at);
