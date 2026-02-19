import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      full_name, email, phone, firm_name, bar_number,
      years_experience, states_licensed, practice_areas,
      bio, referrals, consent_terms, consent_referral
    } = body;

    if (!full_name || !email || !firm_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate application
    const existing = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail });
    const active = existing.filter(a => a.status !== 'rejected');
    if (active.length > 0) {
      return Response.json({ error: 'An application already exists for this email.' }, { status: 409 });
    }

    // Create the application record (no user account created yet)
    const application = await base44.asServiceRole.entities.LawyerApplication.create({
      full_name,
      email: normalizedEmail,
      phone,
      firm_name,
      bar_number,
      years_experience: parseInt(years_experience) || 0,
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      bio,
      referrals: referrals || [],
      consent_terms: !!consent_terms,
      consent_referral: !!consent_referral,
      email_verified: true,
      status: 'pending'
    });

    // Send confirmation email to applicant
    const resendKey = Deno.env.get('RESEND_API_KEY');
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Taylor Made Law <noreply@taylormadelaw.com>',
        to: [normalizedEmail],
        subject: 'Application Received — Taylor Made Law Network',
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #faf8f5;">
            <div style="text-align: center; margin-bottom: 28px;">
              <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 48px;" />
            </div>
            <div style="background: white; border-radius: 16px; padding: 36px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 28px;">✓</div>
                <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 8px;">Application Received!</h1>
                <p style="color: #6b7280; margin: 0;">Hi ${full_name}, you're in the approval queue.</p>
              </div>
              <p style="color: #374151; font-size: 15px; line-height: 1.7;">Our team will review your credentials within <strong>2–3 business days</strong>.</p>
              <p style="color: #374151; font-size: 15px; line-height: 1.7; margin-top: 12px;">Once approved, you'll receive an email with a link to set your password and access the platform.</p>
              <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; text-align: center;">Questions? <a href="mailto:support@taylormadelaw.com" style="color: #3a164d;">support@taylormadelaw.com</a></p>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 24px;">© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
          </div>
        `
      })
    });

    // Notify admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin');
    const adminLink = `${req.headers.get('origin') || 'https://app.taylormadelaw.com'}/admin-lawyer-applications`;

    for (const admin of adminUsers) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Taylor Made Law Alerts <noreply@taylormadelaw.com>',
          to: [admin.email],
          subject: `New Attorney Application — ${full_name} (${firm_name})`,
          html: `
            <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #3a164d;">New Attorney Application</h2>
              <p><strong>Name:</strong> ${full_name}</p>
              <p><strong>Email:</strong> ${normalizedEmail}</p>
              <p><strong>Firm:</strong> ${firm_name}</p>
              <p><strong>States:</strong> ${(states_licensed || []).join(', ')}</p>
              <p><strong>Practice Areas:</strong> ${(practice_areas || []).join(', ')}</p>
              <a href="${adminLink}" style="display:inline-block; background:#3a164d; color:white; padding:12px 24px; border-radius:50px; text-decoration:none; font-weight:700;">Review Application →</a>
            </div>
          `
        })
      });
    }

    // Send referral invites (non-blocking)
    if (referrals && referrals.length > 0) {
      const validRefs = referrals.filter(r => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
      for (const ref of validRefs) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Taylor Made Law <noreply@taylormadelaw.com>',
            to: [ref.email],
            subject: `${full_name} Invites You to Join Taylor Made Law`,
            html: `<p>Hi${ref.name ? ' ' + ref.name : ''},</p><p><strong>${full_name}</strong> thinks you'd be a great fit for the Taylor Made Law attorney network. <a href="${req.headers.get('origin') || 'https://app.taylormadelaw.com'}/for-lawyers">Apply here →</a></p>`
          })
        });
      }
    }

    return Response.json({ success: true, application_id: application.id });

  } catch (error) {
    console.error('Error submitting application:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});