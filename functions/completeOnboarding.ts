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

    const normalizedEmail = payload.email.toLowerCase().trim();

    // Hash password
    const passwordHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(payload.password)
    );
    const passwordHashHex = Array.from(new Uint8Array(passwordHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 1. Create LawyerApplication record so admin can review it
    const appRes = await base44.asServiceRole.entities.LawyerApplication.create({
      full_name: payload.full_name,
      email: normalizedEmail,
      phone: payload.phone,
      firm_name: payload.firm_name,
      bar_number: payload.bar_number,
      states_licensed: payload.states_licensed || [],
      practice_areas: payload.practice_areas || [],
      bio: payload.bio,
      years_experience: payload.years_experience || null,
      consent_terms: payload.consent_terms || false,
      consent_referral: payload.consent_referral || false,
      status: 'pending',
    });

    // 2. Upsert User record with correct params
    const res = await base44.asServiceRole.functions.invoke('upsertUserByEmail', {
      email: normalizedEmail,
      requested_status: 'pending',
      entry_source: 'apply',
      create_if_missing: true,
      actor_email: normalizedEmail,
      actor_role: 'self',
      profile: {
        full_name: payload.full_name,
        phone: payload.phone,
        firm_name: payload.firm_name,
        bar_number: payload.bar_number,
        states_licensed: payload.states_licensed || [],
        practice_areas: payload.practice_areas || [],
        bio: payload.bio,
        password_hash: passwordHashHex,
        password_set: true,
        user_type: 'lawyer',
      },
    });

    if (!res.data?.success) {
      return Response.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    const userId = res.data.user?.id;

    // Audit log
    if (userId) {
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: userId,
        action: 'application_submitted',
        actor_email: normalizedEmail,
        actor_role: 'self',
        notes: `Attorney application submitted. Pending admin review.`,
      });
    }

    return Response.json({
      success: true,
      application_id: appRes?.id,
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return Response.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
});