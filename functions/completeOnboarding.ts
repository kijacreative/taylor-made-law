import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Validate input
    if (!payload.email || !payload.password || !payload.full_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(payload.password)
    );
    const passwordHashHex = Array.from(new Uint8Array(passwordHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create/update user via upsertUserByEmail
    const res = await base44.asServiceRole.functions.invoke('upsertUserByEmail', {
      email: payload.email,
      full_name: payload.full_name,
      phone: payload.phone,
      password_hash: passwordHashHex,
      password_set: true,
      user_status: 'approved', // Auto-approve on signup
      user_type: 'lawyer',
    });

    if (!res.data?.success) {
      return Response.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    const userId = res.data.user_id;

    // Create LawyerProfile
    const profileRes = await base44.asServiceRole.entities.LawyerProfile.create({
      user_id: userId,
      firm_name: payload.firm_name,
      phone: payload.phone,
      bar_number: payload.bar_number,
      states_licensed: payload.states_licensed,
      practice_areas: payload.practice_areas,
      bio: payload.bio,
      years_experience: payload.years_experience || null,
      status: 'approved',
      referral_agreement_accepted: payload.consent_referral,
      referral_agreement_accepted_at: new Date().toISOString(),
    });

    if (!profileRes?.id) {
      return Response.json({ error: 'Failed to create lawyer profile' }, { status: 500 });
    }

    // ── Phase 8: Audit logging ─────────────────────────────────────
    if (userId) {
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: userId,
        action: 'activation_completed',
        actor_email: payload.email,
        actor_role: 'self',
        notes: `Account activated. Password set. Profile created.`,
      });
    }

    // Send admin alert email (optional, can be async)
    // await base44.integrations.Core.SendEmail({...})

    return Response.json({
      success: true,
      user_id: userId,
      profile_id: profileRes.id,
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return Response.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
});