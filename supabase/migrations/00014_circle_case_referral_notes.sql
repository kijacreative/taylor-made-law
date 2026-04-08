-- 00014_circle_case_referral_notes.sql
-- Add referral fee, proposed fee, and notes to circle cases

ALTER TABLE legal_circle_cases ADD COLUMN IF NOT EXISTS referral_percentage integer DEFAULT 25;
ALTER TABLE legal_circle_cases ADD COLUMN IF NOT EXISTS proposed_fee integer;
ALTER TABLE legal_circle_cases ADD COLUMN IF NOT EXISTS notes text;
