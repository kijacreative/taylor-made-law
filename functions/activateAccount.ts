/**
 * activateAccount — Validates activation token and registers the user's account.
 * Flow: approve → email with token → activate page → set password → register account → access portal
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return Response.json({ error: 'token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Hash the token to look it up
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Find the activation token record
    const tokens = await base44.asServiceRole.entities.ActivationToken.filter({
      token_hash: tokenHash,
      token_type: 'activation'
    });

    if (!tokens || tokens.length === 0) {
      return Response.json({ error: 'Invalid or expired activation link.' }, { status: 400 });
    }

    const tokenRecord = tokens.find(t => !t.used_at);
    if (!tokenRecord) {
      return Response.json({
        error: 'This activation link has already been used. Please log in.',
        already_used: true
      }, { status: 400 });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({
        error: 'This activation link has expired.',
        expired: true,
        user_email: tokenRecord.user_email
      }, { status: 400 });
    }

    const normalizedEmail = tokenRecord.user_email.toLowerCase().trim();

    // Find the approved application to get full_name and profile data
    const applications = await base44.asServiceRole.entities.LawyerApplication.filter({
      email: normalizedEmail,
      status: 'approved'
    });
    const application = applications[0] || null;

    if (!application) {
      return Response.json({ error: 'Approved application not found. Please contact support.' }, { status: 404 });
    }

    const fullName = application.full_name || '';

    // Register the account — creates their auth account with the chosen password
    // If already registered, they can just log in normally
    try {
      await base44.auth.register({
        email: normalizedEmail,
        password,
        full_name: fullName,
      });
    } catch (regErr) {
      // Already registered — that's okay, token was valid so just proceed
      console.log('Register note:', regErr.message);
    }

    // Mark token as used
    await base44.asServiceRole.entities.ActivationToken.update(tokenRecord.id, {
      used_at: new Date().toISOString()
    });

    // Mark application as user_created
    await base44.asServiceRole.entities.LawyerApplication.update(application.id, {
      user_created: true,
    });

    // Wait briefly for the User entity to be created by the register call
    await new Promise(r => setTimeout(r, 800));

    // Update the User entity with approved status and profile data from the application
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (existingUsers && existingUsers.length > 0) {
      await base44.asServiceRole.entities.User.update(existingUsers[0].id, {
        user_status: 'approved',
        firm_name: application.firm_name || '',
        phone: application.phone || '',
        bar_number: application.bar_number || '',
        states_licensed: application.states_licensed || [],
        practice_areas: application.practice_areas || [],
        years_experience: application.years_experience || 0,
        bio: application.bio || '',
        free_trial_months: application.free_trial_months || 0,
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: normalizedEmail,
      action: 'activation_completed',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: 'Account activated and password set successfully.'
    });

    return Response.json({
      success: true,
      message: 'Account activated! You can now log in.',
    });

  } catch (error) {
    console.error('activateAccount error:', error);
    // If register fails because user already exists, treat as success (they can just log in)
    if (error.message && error.message.toLowerCase().includes('already')) {
      return Response.json({
        success: true,
        already_exists: true,
        message: 'Account already exists. Please log in.',
      });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});