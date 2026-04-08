-- 00011_add_referral_percentage.sql
-- Add referral fee percentage to cases table (default 25%)

ALTER TABLE cases ADD COLUMN IF NOT EXISTS referral_percentage integer DEFAULT 25;
