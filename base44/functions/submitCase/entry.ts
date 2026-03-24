import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      circle_id,
      title,
      summary,
      description,
      state,
      practice_area,
      estimated_value,
      client_first_name,
      client_last_name,
      client_email,
      client_phone,
    } = body;

    // Verify attorney has an approved LawyerProfile
    const profiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile || profile.status !== 'approved') {
      return Response.json({ error: 'An approved attorney profile is required to submit cases.', code: 'PROFILE_REQUIRED' }, { status: 403 });
    }

    // If submitting to a circle, verify user is a member
    if (circle_id) {
      const memberships = await base44.entities.LegalCircleMember.filter({
        user_id: user.id,
        circle_id: circle_id,
        status: 'active'
      });

      if (memberships.length === 0) {
        return Response.json(
          { error: 'You must be an active member of this circle to submit cases' },
          { status: 403 }
        );
      }

      // Create the LegalCircleCase
      const caseData = {
        circle_id,
        title,
        summary,
        description,
        state,
        practice_area,
        estimated_value: estimated_value ? parseFloat(estimated_value) : undefined,
        client_first_name,
        client_last_name,
        client_email,
        client_phone,
        submitted_by_user_id: user.id,
        submitted_by_name: user.full_name,
        status: 'pending_approval'
      };

      const result = await base44.asServiceRole.entities.LegalCircleCase.create(caseData);
      return Response.json({ success: true, case: result });
    } else {
      // Submit to main Case exchange
      const caseData = {
        title,
        description,
        state,
        practice_area,
        estimated_value: estimated_value ? parseFloat(estimated_value) : undefined,
        client_first_name,
        client_last_name,
        client_email,
        client_phone,
        status: 'draft'
      };

      const result = await base44.entities.Case.create(caseData);
      return Response.json({ success: true, case: result });
    }
  } catch (error) {
    console.error('Case submission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});