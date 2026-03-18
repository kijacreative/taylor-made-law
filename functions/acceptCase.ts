import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await req.json();

    if (!caseId) {
      return Response.json({ error: 'caseId is required' }, { status: 400 });
    }

    // Fetch the case
    const cases = await base44.asServiceRole.entities.Case.filter({ id: caseId });
    const caseItem = cases[0];

    if (!caseItem) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseItem.status !== 'published') {
      return Response.json({ error: 'Case is no longer available' }, { status: 409 });
    }

    // Verify user is approved
    const isApproved = user.user_status === 'approved';
    if (!isApproved) {
      // Check LawyerProfile
      const profiles = await base44.entities.LawyerProfile.filter({ user_id: user.id });
      const profile = profiles[0];
      if (!profile || profile.status !== 'approved') {
        return Response.json({ error: 'Account must be approved before accepting cases' }, { status: 403 });
      }
    }

    // Get profile for the accepted_by field
    const profiles = await base44.entities.LawyerProfile.filter({ user_id: user.id });
    const lawyerProfile = profiles[0];

    // Update case as service role (bypasses RLS)
    await base44.asServiceRole.entities.Case.update(caseId, {
      status: 'accepted',
      accepted_by: lawyerProfile?.id || user.id,
      accepted_by_email: user.email,
      accepted_at: new Date().toISOString(),
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Case',
      entity_id: caseId,
      action: 'accept_case',
      actor_email: user.email,
      actor_role: 'lawyer',
      notes: `Case accepted by ${user.full_name || user.email}`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});