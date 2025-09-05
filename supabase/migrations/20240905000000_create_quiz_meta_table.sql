-- Migration: Create quiz_meta table for storing quiz title
CREATE TABLE IF NOT EXISTS quiz_meta (
    quiz_id SERIAL PRIMARY KEY,
    quiz_title TEXT NOT NULL DEFAULT 'Daily Quiz'
);

-- Remove quiz_title column from app_settings if exists
ALTER TABLE app_settings DROP COLUMN IF EXISTS quiz_title;
