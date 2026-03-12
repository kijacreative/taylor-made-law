/**
 * postActivationSync — Called from the frontend AFTER base44.auth.register() succeeds.
 * Finds the newly created User entity and stamps it with:
 *  - email_verified = true
 *  - password_set = true
 *  - user_status, profile data copied from LawyerApplication (if approved)
 *
 * This is a public endpoint (no user auth required) — it uses asServiceRole.
 * The email param acts as the identifier, and we trust it because the activation
 * token was already validated in activateAccount before register() was called.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Wait for User entity to be created by Base44 after register()
    // Retry up to 4 times with backoff
    let userEntity = null;
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? 800 : 600));
      const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
      if (users && users.length > 0) {
        userEntity = users[0];
        break;
      }
    }

    if (!userEntity) {
      // User entity still not found — not critical, user is logged in via register() session
      console.warn('postActivationSync: User entity not found after retries for', normalizedEmail);
      return Response.json({ success: true, user_synced: false });
    }

    const updateData = {
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      password_set: true,
    };

    // Copy profile data from approved LawyerApplication
    const applications = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail });
    const app = applications.find(a => a.status === 'approved') || applications[0] || null;

    if (app) {
      if (!userEntity.firm_name && app.firm_name) updateData.firm_name = app.firm_name;
      if (!userEntity.phone && app.phone) updateData.phone = app.phone;
      if (!userEntity.bar_number && app.bar_number) updateData.bar_number = app.bar_number;
      if (!userEntity.bio && app.bio) updateData.bio = app.bio;
      if (!userEntity.states_licensed?.length && app.states_licensed?.length) {
        updateData.states_licensed = app.states_licensed;
      }
      if (!userEntity.practice_areas?.length && app.practice_areas?.length) {
        updateData.practice_areas = app.practice_areas;
      }
      if (!userEntity.years_experience && app.years_experience) {
        updateData.years_experience = app.years_experience;
      }
      // Carry approved status forward
      if (app.status === 'approved' && (!userEntity.user_status || userEntity.user_status === 'pending' || userEntity.user_status === 'invited')) {
        updateData.user_status = 'approved';
        if (app.reviewed_by) updateData.approved_by = app.reviewed_by;
        if (app.reviewed_at) updateData.approved_at = app.reviewed_at;
      }
      await base44.asServiceRole.entities.LawyerApplication.update(app.id, {
        user_created: true,
      }).catch(() => {});
    }

    await base44.asServiceRole.entities.User.update(userEntity.id, updateData);

    // Upsert LawyerProfile for backward compatibility
    if (app) {
      const existingProfiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: userEntity.id });
      const profileData = {
        user_id: userEntity.id,
        firm_name: app.firm_name || '',
        phone: app.phone || '',
        bar_number: app.bar_number || '',
        bio: app.bio || '',
        states_licensed: app.states_licensed || [],
        practice_areas: app.practice_areas || [],
        years_experience: app.years_experience || 0,
        status: app.status === 'approved' ? 'approved' : 'pending',
        ...(app.status === 'approved' ? {
          approved_at: app.reviewed_at || new Date().toISOString(),
          approved_by: app.reviewed_by || '',
        } : {}),
      };
      if (existingProfiles.length > 0) {
        await base44.asServiceRole.entities.LawyerProfile.update(existingProfiles[0].id, profileData).catch(() => {});
      } else {
        await base44.asServiceRole.entities.LawyerProfile.create(profileData).catch(() => {});
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: userEntity.id,
      action: 'activation_completed',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: 'Account activated and entities synced successfully.'
    }).catch(() => {});

    return Response.json({ success: true, user_synced: true });

  } catch (error) {
    console.error('postActivationSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});