-- Create table to track which questions have been asked to which users
-- Allows the app to exclude previously asked questions when generating a daily quiz
CREATE TABLE IF NOT EXISTS asked_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id text NOT NULL,
  quiz_id uuid,
  asked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_profiles FOREIGN KEY(user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asked_questions_user_question ON asked_questions (user_id, question_id);

-- Optional: RLS policies can be added later to restrict access per user
