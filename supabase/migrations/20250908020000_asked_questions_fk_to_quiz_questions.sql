-- Ensure asked_questions.question_id is uuid and add FK to quiz_questions(id) with ON DELETE CASCADE
-- Make sure the referenced table has a usable uuid `id` primary key.
-- This migration is defensive because `quiz_questions` may have been created outside of migrations
-- (for example via the Supabase dashboard) and may not have an `id` column of type uuid.
DO $$
BEGIN
  -- 0a) If `id` column is missing on quiz_questions, add it as a uuid with gen_random_uuid()
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quiz_questions' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.quiz_questions ADD COLUMN id uuid DEFAULT gen_random_uuid();
  ELSE
    -- 0b) If id exists but is not uuid, try to convert safely
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'quiz_questions' AND column_name = 'id' AND data_type <> 'uuid'
    ) THEN
      BEGIN
        ALTER TABLE public.quiz_questions
          ALTER COLUMN id TYPE uuid USING (NULLIF(trim(id),'')::uuid);
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not cast quiz_questions.id to uuid automatically. Please ensure values are valid UUIDs before running this migration.';
      END;
    END IF;
  END IF;

  -- 0c) Ensure there's a primary key on quiz_questions.id if possible
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'p' AND t.relname = 'quiz_questions'
  ) THEN
    -- Only add PK if there are no NULLs and values are unique
    IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE id IS NULL)
       AND (SELECT COUNT(id) = COUNT(DISTINCT id) FROM public.quiz_questions) THEN
      ALTER TABLE public.quiz_questions ADD CONSTRAINT pk_quiz_questions_id PRIMARY KEY (id);
    ELSE
      RAISE NOTICE 'Skipping adding primary key on quiz_questions.id - table contains NULLs or duplicate ids. Clean data first.';
    END IF;
  END IF;
END$$;

-- 1) If asked_questions.question_id is not uuid, try to convert text values that look like uuids and alter column type
DO $$
BEGIN
  -- check column type
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='asked_questions' AND column_name='question_id' AND data_type <> 'uuid') THEN
    -- attempt to alter column using USING to cast strings to uuid where possible
    BEGIN
      ALTER TABLE public.asked_questions
        ALTER COLUMN question_id TYPE uuid USING (NULLIF(trim(question_id),'')::uuid);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not cast asked_questions.question_id to uuid automatically. Please ensure values are valid UUIDs before running this migration.';
    END;
  END IF;
END$$;

-- 1b) Move any orphaned asked_questions (question_id not present in quiz_questions) to a backup table
DO $$
BEGIN
  -- Create a backup table with same structure if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'asked_questions_orphaned'
  ) THEN
    EXECUTE 'CREATE TABLE public.asked_questions_orphaned (LIKE public.asked_questions INCLUDING ALL)';
  END IF;

  -- Insert orphaned rows into backup table
  INSERT INTO public.asked_questions_orphaned
  SELECT * FROM public.asked_questions aq
  WHERE aq.question_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.quiz_questions q WHERE q.id = aq.question_id);

  -- Delete those orphaned rows from asked_questions so FK can be added safely
  DELETE FROM public.asked_questions aq
  WHERE aq.question_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.quiz_questions q WHERE q.id = aq.question_id);

  RAISE NOTICE 'Moved orphaned asked_questions to asked_questions_orphaned';
END$$;

-- 2) Drop existing constraint if present and add FK with ON DELETE CASCADE
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = con.connamespace
  WHERE rel.relname = 'asked_questions' AND nsp.nspname = 'public' AND con.contype = 'f'
    AND (SELECT array_to_string(conkey,',') FROM pg_constraint WHERE conname = con.conname) IS NOT NULL;

  -- If a foreign key exists referencing quiz_questions, drop it first
  IF constraint_name IS NOT NULL THEN
    -- Only drop if it references quiz_questions
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.confrelid
      WHERE c.conname = constraint_name AND r.relname = 'quiz_questions'
    ) THEN
      EXECUTE format('ALTER TABLE public.asked_questions DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
  END IF;

  -- Add new FK constraint (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'asked_questions' AND kcu.column_name = 'question_id'
  ) THEN
    ALTER TABLE public.asked_questions
      ADD CONSTRAINT fk_quiz_questions FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 3) Ensure index exists for faster deletes/joins
CREATE INDEX IF NOT EXISTS idx_asked_questions_question_id ON public.asked_questions (question_id);
