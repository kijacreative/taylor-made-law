/**
 * Edge Function: auth-signup
 *
 * Replaces Base44 functions:
 *   - publicLawyerSignup    (public signup with password + profile creation)
 *   - submitLawyerApplication (application without account creation)
 *   - activateAccount       (token-based activation + password set)
 *   - activateAttorney      (invitation-based activation)
 *   - activateFromApplication (application-based activation)
 *   - registerActivation    (token validation + auth.register)
 *   - finalizeActivation    (post-OTP status finalization)
 *
 * Also absorbs logic from:
 *   - applyToNetwork, joinLawyerNetwork, joinNetwork (variants)
 *   - notifyAdminNewLawyer (admin email notification)
 *
 * Routes (via action parameter):
 *   POST { action: 'signup', email, password, ...profileData }
 *   POST { action: 'apply', ...applicationData }
 *   POST { action: 'activate', token, password }
 *   POST { action: 'finalize', email }
 *
 * External services: Resend (email)
 * Auth: Public (no JWT required)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { tmlEmailWrapper, tmlButton, tmlH1, tmlP, APP_URL } from '../_shared/email-templates.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SHA-256 hash a string, return hex digest. */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Normalize email: lowercase + trim. */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Send admin notification about a new signup/application (fire-and-forget). */
function notifyAdmins(sb: ReturnType<typeof createAdminClient>, subject: string, bodyHtml: string) {
  // Look up admin emails, then send notification
  sb.from('profiles')
    .select('email')
    .eq('role', 'admin')
    .then(({ data: admins }) => {
      if (!admins || admins.length === 0) {
        console.warn('[auth-signup] No admin profiles found for notification');
        return;
      }
      const adminEmails = admins.map((a: { email: string }) => a.email);
      sendEmail({
        to: adminEmails,
        subject,
        html: tmlEmailWrapper(bodyHtml),
      }).catch((err) => console.error('[auth-signup] Admin notification failed:', err));
    })
    .catch((err: Error) => console.error('[auth-signup] Admin lookup failed:', err));
}

// ---------------------------------------------------------------------------
// Action: signup — replaces publicLawyerSignup
// ---------------------------------------------------------------------------

async function handleSignup(body: Record<string, unknown>) {
  const {
    email: rawEmail,
    password,
    full_name,
    phone,
    firm_name,
    bar_number,
    bar_numbers,
    years_experience,
    states_licensed,
    practice_areas,
    bio,
    consent_terms,
    circle_token,
  } = body;

  // Validate required fields
  if (!full_name || !rawEmail || !firm_name) {
    return errorResponse('Missing required fields: full_name, email, firm_name', 400);
  }

  const email = normalizeEmail(rawEmail as string);

  // Validate password
  if (!password || (password as string).length < 8) {
    return errorResponse('Password must be at least 8 characters', 400);
  }

  const sb = createAdminClient();

  // Check for circle invite if circle_token provided
  let hasCircleInvite = false;
  if (circle_token) {
    const { data: invite } = await sb
      .from('legal_circle_invitations')
      .select('id, circle_id')
      .eq('token', circle_token as string)
      .eq('status', 'pending')
      .maybeSingle();
    hasCircleInvite = !!invite;
  }

  // Create Supabase Auth account
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password: password as string,
    email_confirm: false,
    user_metadata: { full_name },
  });

  if (authError) {
    // Check for duplicate email
    if (
      authError.message?.includes('already been registered') ||
      authError.message?.includes('already exists') ||
      authError.message?.includes('duplicate')
    ) {
      return jsonResponse({ error: 'Email already registered', error_code: 'email_taken' }, 409);
    }
    console.error('[auth-signup] createUser error:', authError.message);
    return errorResponse(authError.message, 500);
  }

  const userId = authData.user.id;

  // Update the auto-created profiles row with additional fields
  // (the on_auth_user_created trigger creates a bare profile with id + email)
  const { error: profileError } = await sb
    .from('profiles')
    .update({
      full_name: full_name as string,
      phone: phone || null,
      firm_name: firm_name as string,
      bar_number: bar_number || null,
      bio: bio || null,
      years_experience: years_experience || null,
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      user_status: 'pending',
    })
    .eq('id', userId);

  if (profileError) {
    console.error('[auth-signup] profile update error:', profileError.message);
  }

  // Create lawyer_applications row
  const { data: application, error: appError } = await sb
    .from('lawyer_applications')
    .insert({
      user_id: userId,
      full_name: full_name as string,
      email,
      phone: phone || null,
      firm_name: firm_name as string,
      bar_number: bar_number || null,
      bar_numbers: bar_numbers || {},
      years_experience: years_experience || null,
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      bio: bio || null,
      consent_terms: consent_terms || false,
      status: 'active_pending_review',
      signup_source: circle_token ? 'circle_invite' : 'public_form',
      circle_token: circle_token || null,
    })
    .select('id')
    .single();

  if (appError) {
    console.error('[auth-signup] application insert error:', appError.message);
    return errorResponse('Failed to create application', 500);
  }

  // Create lawyer_profiles row
  const { error: lpError } = await sb.from('lawyer_profiles').insert({
    user_id: userId,
    full_name: full_name as string,
    email,
    firm_name: firm_name as string,
    phone: phone || null,
    bar_number: bar_number || null,
    bar_numbers: bar_numbers || {},
    bio: bio || null,
    years_experience: years_experience || null,
    states_licensed: states_licensed || [],
    practice_areas: practice_areas || [],
    status: 'pending',
  });

  if (lpError) {
    console.error('[auth-signup] lawyer_profiles insert error:', lpError.message);
  }

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'LawyerApplication',
      entity_id: application.id,
      action: 'signup',
      actor_email: email,
      actor_role: 'user',
      notes: `New signup: ${full_name} (${email}) from ${firm_name}`,
    })
    .then(() => {});

  // Admin notification (fire-and-forget)
  notifyAdmins(
    sb,
    `New Lawyer Signup: ${full_name}`,
    [
      tmlH1('New Lawyer Signup'),
      tmlP(`<strong>${full_name}</strong> from <strong>${firm_name}</strong> has signed up for Taylor Made Law.`),
      tmlP(`Email: ${email}`),
      tmlP(`Phone: ${phone || 'Not provided'}`),
      tmlP(`Bar Number: ${bar_number || 'Not provided'}`),
      tmlButton(`${APP_URL}/AdminApplications`, 'Review Application'),
    ].join('')
  );

  return jsonResponse({
    data: {
      success: true,
      application_id: application.id,
      has_circle_invite: hasCircleInvite,
    },
  });
}

// ---------------------------------------------------------------------------
// Action: apply — replaces submitLawyerApplication
// ---------------------------------------------------------------------------

async function handleApply(body: Record<string, unknown>) {
  const {
    full_name,
    email: rawEmail,
    phone,
    firm_name,
    bar_number,
    years_experience,
    states_licensed,
    practice_areas,
    bio,
    consent_terms,
    consent_referral,
    referrals,
  } = body;

  // Validate required fields
  if (!full_name || !rawEmail) {
    return errorResponse('Missing required fields: full_name, email', 400);
  }

  const email = normalizeEmail(rawEmail as string);
  const sb = createAdminClient();

  // Check if a profiles row already exists for this email (user may have been invited)
  const { data: existingProfile } = await sb
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  // Create lawyer_applications row
  const { data: application, error: appError } = await sb
    .from('lawyer_applications')
    .insert({
      user_id: existingProfile?.id || null,
      full_name: full_name as string,
      email,
      phone: phone || null,
      firm_name: firm_name || null,
      bar_number: bar_number || null,
      years_experience: years_experience || null,
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      bio: bio || null,
      consent_terms: consent_terms || false,
      consent_referral: consent_referral || false,
      referrals: referrals || [],
      status: 'pending',
    })
    .select('id')
    .single();

  if (appError) {
    console.error('[auth-signup] apply insert error:', appError.message);
    return errorResponse('Failed to create application', 500);
  }

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'LawyerApplication',
      entity_id: application.id,
      action: 'apply',
      actor_email: email,
      actor_role: 'public',
      notes: `New application: ${full_name} (${email})`,
    })
    .then(() => {});

  // Admin notification (fire-and-forget)
  notifyAdmins(
    sb,
    `New Lawyer Application: ${full_name}`,
    [
      tmlH1('New Lawyer Application'),
      tmlP(`<strong>${full_name}</strong> has submitted an application to join Taylor Made Law.`),
      tmlP(`Email: ${email}`),
      tmlP(`Firm: ${firm_name || 'Not provided'}`),
      tmlButton(`${APP_URL}/AdminApplications`, 'Review Application'),
    ].join('')
  );

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// Action: activate — replaces activateAccount
// ---------------------------------------------------------------------------

async function handleActivate(body: Record<string, unknown>) {
  const { token, password } = body;

  if (!token) {
    return errorResponse('Missing activation token', 400);
  }
  if (!password || (password as string).length < 8) {
    return errorResponse('Password must be at least 8 characters', 400);
  }

  const sb = createAdminClient();

  // Hash the token and look it up
  const tokenHash = await sha256(token as string);

  const { data: tokenRow, error: tokenError } = await sb
    .from('activation_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (tokenError) {
    console.error('[auth-signup] token lookup error:', tokenError.message);
    return errorResponse('Failed to validate token', 500);
  }

  if (!tokenRow) {
    return errorResponse('Invalid activation link', 400);
  }

  // Check if already used
  if (tokenRow.used_at) {
    return jsonResponse({ data: { already_used: true } });
  }

  // Check if expired
  if (new Date(tokenRow.expires_at) < new Date()) {
    return jsonResponse({ data: { expired: true } });
  }

  const email = normalizeEmail(tokenRow.user_email);
  const now = new Date().toISOString();

  // Mark token as used
  await sb
    .from('activation_tokens')
    .update({ used_at: now })
    .eq('id', tokenRow.id);

  // Find or create auth.users account for this email
  let userId: string;

  // Try to find existing user by email
  const { data: existingUsers } = await sb.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u: { email?: string }) => u.email?.toLowerCase() === email
  );

  if (existingUser) {
    // Update existing user's password
    userId = existingUser.id;
    const { error: updateAuthErr } = await sb.auth.admin.updateUserById(userId, {
      password: password as string,
      email_confirm: true,
    });
    if (updateAuthErr) {
      console.error('[auth-signup] updateUser error:', updateAuthErr.message);
      return errorResponse('Failed to set password', 500);
    }
  } else {
    // Create new auth user
    const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
      email,
      password: password as string,
      email_confirm: true,
      user_metadata: { full_name: email },
    });
    if (createErr) {
      console.error('[auth-signup] createUser error:', createErr.message);
      return errorResponse('Failed to create account', 500);
    }
    userId = newUser.user.id;
  }

  // Update profiles row
  const { error: profileErr } = await sb
    .from('profiles')
    .update({
      email_verified: true,
      password_set: true,
      account_activated_at: now,
      user_status: 'approved',
    })
    .eq('id', userId);

  if (profileErr) {
    console.error('[auth-signup] profile update error:', profileErr.message);
  }

  // Update lawyer_applications (by email)
  const { error: appErr } = await sb
    .from('lawyer_applications')
    .update({
      user_created: true,
      status: 'active',
      user_id: userId,
    })
    .eq('email', email);

  if (appErr) {
    console.error('[auth-signup] application update error:', appErr.message);
  }

  // Create or update lawyer_profiles
  const { data: existingLp } = await sb
    .from('lawyer_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingLp) {
    await sb
      .from('lawyer_profiles')
      .update({ status: 'approved' })
      .eq('id', existingLp.id);
  } else {
    // Pull profile data to populate lawyer_profiles
    const { data: profile } = await sb
      .from('profiles')
      .select('full_name, email, firm_name, phone, bar_number, bio, states_licensed, practice_areas, years_experience')
      .eq('id', userId)
      .single();

    if (profile) {
      await sb.from('lawyer_profiles').insert({
        user_id: userId,
        full_name: profile.full_name,
        email: profile.email,
        firm_name: profile.firm_name,
        phone: profile.phone,
        bar_number: profile.bar_number,
        bio: profile.bio,
        states_licensed: profile.states_licensed || [],
        practice_areas: profile.practice_areas || [],
        years_experience: profile.years_experience,
        status: 'approved',
      });
    }
  }

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'User',
      entity_id: userId,
      action: 'activate_account',
      actor_id: userId,
      actor_email: email,
      actor_role: 'user',
      notes: `Account activated via token`,
    })
    .then(() => {});

  return jsonResponse({ data: { success: true, email } });
}

// ---------------------------------------------------------------------------
// Action: finalize — replaces finalizeActivation
// ---------------------------------------------------------------------------

async function handleFinalize(body: Record<string, unknown>) {
  const { email: rawEmail } = body;

  if (!rawEmail) {
    return errorResponse('Missing email', 400);
  }

  const email = normalizeEmail(rawEmail as string);
  const sb = createAdminClient();
  const now = new Date().toISOString();

  // Find profiles row by email
  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profileErr || !profile) {
    return errorResponse('Profile not found for this email', 404);
  }

  const userId = profile.id;

  // Update profiles
  const { error: updateErr } = await sb
    .from('profiles')
    .update({
      email_verified: true,
      password_set: true,
      user_status: 'approved',
      account_activated_at: now,
    })
    .eq('id', userId);

  if (updateErr) {
    console.error('[auth-signup] finalize profile update error:', updateErr.message);
    return errorResponse('Failed to finalize account', 500);
  }

  // Update lawyer_applications (by email)
  await sb
    .from('lawyer_applications')
    .update({ status: 'active', user_id: userId })
    .eq('email', email);

  // Create or update lawyer_profiles
  const { data: existingLp } = await sb
    .from('lawyer_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingLp) {
    await sb
      .from('lawyer_profiles')
      .update({ status: 'approved' })
      .eq('id', existingLp.id);
  } else {
    // Pull profile data to populate lawyer_profiles
    const { data: fullProfile } = await sb
      .from('profiles')
      .select('full_name, email, firm_name, phone, bar_number, bio, states_licensed, practice_areas, years_experience')
      .eq('id', userId)
      .single();

    if (fullProfile) {
      await sb.from('lawyer_profiles').insert({
        user_id: userId,
        full_name: fullProfile.full_name,
        email: fullProfile.email,
        firm_name: fullProfile.firm_name,
        phone: fullProfile.phone,
        bar_number: fullProfile.bar_number,
        bio: fullProfile.bio,
        states_licensed: fullProfile.states_licensed || [],
        practice_areas: fullProfile.practice_areas || [],
        years_experience: fullProfile.years_experience,
        status: 'approved',
      });
    }
  }

  // Audit log (fire-and-forget)
  sb.from('audit_logs')
    .insert({
      entity_type: 'User',
      entity_id: userId,
      action: 'finalize_activation',
      actor_id: userId,
      actor_email: email,
      actor_role: 'user',
      notes: `Account finalized post-OTP verification`,
    })
    .then(() => {});

  return jsonResponse({ data: { success: true } });
}

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'signup':
        return await handleSignup(body);
      case 'apply':
        return await handleApply(body);
      case 'activate':
        return await handleActivate(body);
      case 'finalize':
        return await handleFinalize(body);
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error('auth-signup function error:', (err as Error).message);
    return errorResponse((err as Error).message || 'Internal error', 500);
  }
});
