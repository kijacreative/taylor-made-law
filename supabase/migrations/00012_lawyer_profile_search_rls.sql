-- 00012_lawyer_profile_search_rls.sql
-- Allow approved lawyers to view other approved lawyer profiles
-- (needed for attorney search in messaging, circles, etc.)

CREATE POLICY "Approved lawyers can view other approved profiles"
  ON lawyer_profiles FOR SELECT
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_status = 'approved'
    )
  );
