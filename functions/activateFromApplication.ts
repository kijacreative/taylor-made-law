import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, email, password } = body;

    if (!token || !email || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Hash the token
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Find the approved application with this token
    const allApps = await base44.asServiceRole.entities.LawyerApplication.filter({
      email: normalizedEmail,
      status: 'approved'
    });

    if (!allApps || allApps.length === 0) {
      return Response.json({ error: 'Invalid or expired activation link.' }, { status: 400 });
    }

    const application = allApps.find(a => a.activation_token_hash === tokenHash);

    if (!application) {
      return Response.json({ error: 'Invalid activation token.' }, { status: 400 });
    }

    if (application.activation_token_used) {
      return Response.json({ error: 'This activation link has already been used. Please log in.' }, { status: 400 });
    }

    if (new Date(application.activation_token_expires_at) < new Date()) {
      return Response.json({ error: 'Activation link has expired. Please contact support.' }, { status: 400 });
    }

    // Register the user account
    await base44.asServiceRole.auth.register({
      email: normalizedEmail,
      password,
      full_name: application.full_name
    });

    // Wait a moment for user to be created
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find the new user
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const newUser = users[0];

    // Create the lawyer profile
    if (newUser) {
      const profileData = {
        user_id: newUser.id,
        firm_name: application.firm_name,
        bar_number: application.bar_number || '',
        bio: application.bio || '',
        phone: application.phone || '',
        states_licensed: application.states_licensed || [],
        practice_areas: application.practice_areas || [],
        years_experience: application.years_experience || 0,
        status: 'approved',
        referral_agreement_accepted: application.consent_referral,
        referral_agreement_accepted_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        subscription_status: 'none'
      };
      await base44.asServiceRole.entities.LawyerProfile.create(profileData);
    }

    // Mark token as used
    await base44.asServiceRole.entities.LawyerApplication.update(application.id, {
      activation_token_used: true,
      user_created: true
    });

    return Response.json({ success: true, message: 'Account created. Please log in.' });

  } catch (error) {
    console.error('Error activating from application:', error);
    // If user already exists error
    if (error.message && error.message.includes('already')) {
      return Response.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});