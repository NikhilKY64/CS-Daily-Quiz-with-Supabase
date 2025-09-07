-- Table to store the canonical daily quiz (same questions for all students on a date)
CREATE TABLE IF NOT EXISTS daily_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date date NOT NULL UNIQUE,
  question_ids jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_quizzes_quiz_date ON daily_quizzes (quiz_date);

-- Note: RLS policies for this table are optional; typical pattern is to allow
-- public SELECT (so clients can read today's quiz) while restricting INSERT
-- to authenticated users or admins. Add policies if you want stricter control.
