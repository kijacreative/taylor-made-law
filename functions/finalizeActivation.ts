/**
 * finalizeActivation — Called after base44.auth.verifyOtp succeeds.
 * Sets user_status=approved on User entity and LawyerApplication status=active.
 * Also sets password_set=true and email_verified=true on the User entity.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Note: user may or may not be authenticated at this point depending on timing.
    // We accept email in the request body and do service-role updates.
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date().toISOString();

    // Find user entity
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail }).catch(() => []);
    const userRecord = users[0] || null;

    if (userRecord) {
      await base44.asServiceRole.entities.User.update(userRecord.id, {
        email_verified: true,
        email_verified_at: now,
        password_set: true,
        user_status: userRecord.user_status === 'approved' ? 'approved' : (userRecord.user_status || 'approved'),
      });
    }

    // Mark LawyerApplication as active
    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail }).catch(() => []);
    const app = apps.find(a => ['approved', 'approved_pending_activation'].includes(a.status)) || apps[0] || null;
    if (app) {
      await base44.asServiceRole.entities.LawyerApplication.update(app.id, {
        status: 'active',
        user_created: true,
        email_verified: true,
      }).catch(() => {});
    }

    // Ensure LawyerProfile exists
    if (userRecord && app) {
      const profiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: userRecord.id }).catch(() => []);
      if (profiles.length === 0) {
        await base44.asServiceRole.entities.LawyerProfile.create({
          user_id: userRecord.id,
          firm_name: app.firm_name || '',
          phone: app.phone || '',
          bar_number: app.bar_number || '',
          bio: app.bio || '',
          states_licensed: app.states_licensed || [],
          practice_areas: app.practice_areas || [],
          years_experience: app.years_experience || 0,
          status: 'approved',
          approved_at: now,
        }).catch(() => {});
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: userRecord?.id || normalizedEmail,
      action: 'activation_finalized',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: `Email verified via Base44 OTP. Activation complete.`
    }).catch(() => {});

    return Response.json({ success: true });

  } catch (error) {
    console.error('finalizeActivation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});