-- 00015_circle_case_update_rls.sql
-- Allow circle members to update cases (accept, add notes, close)

CREATE POLICY "Members can update circle cases"
  ON legal_circle_cases FOR UPDATE
  USING (is_circle_member(circle_id, auth.uid()));
