/**
 * publicLawyerSignup — Unauthenticated public lawyer signup endpoint.
 *
 * Creates a LawyerApplication with status=active_pending_review
 * and notifies admin. Does NOT use inviteUser or any admin-only action.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL = 'support@taylormadelaw.com';
const FROM_EMAIL = 'Taylor Made Law <no-reply@taylormadelaw.com>';

async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { full_name, email, phone, firm_name, bar_number, years_experience, states_licensed, practice_areas, bio } = body;

    // Basic validation
    if (!full_name || !email || !firm_name) {
      return Response.json({ success: false, error: 'Full name, email, and firm name are required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ success: false, error: 'Invalid email address.' }, { status: 400 });
    }

    // Check for duplicate application using service role
    const existing = await base44.asServiceRole.entities.LawyerApplication.filter({ email });
    if (existing && existing.length > 0) {
      return Response.json({ success: false, error: 'An application with this email already exists. Please contact support if you need help.' }, { status: 409 });
    }

    // Create the application record
    const application = await base44.asServiceRole.entities.LawyerApplication.create({
      full_name,
      email,
      phone: phone || '',
      firm_name,
      bar_number: bar_number || '',
      years_experience: Number(years_experience) || 0,
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      bio: bio || '',
      status: 'active_pending_review',
      signup_source: 'public_form',
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'LawyerApplication',
      entity_id: application.id,
      action: 'public_signup_submitted',
      actor_email: email,
      actor_role: 'applicant',
      notes: `Public signup submitted by ${full_name} (${email}) from firm ${firm_name}`,
    }).catch(() => {});

    // Notify admin
    await sendEmail(
      ADMIN_EMAIL,
      `New Lawyer Signup: ${full_name} — ${firm_name}`,
      `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#3a164d;">New Lawyer Signup</h2>
          <p>A new attorney has submitted a public signup application and needs review.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Name</td><td style="padding:8px;">${full_name}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Email</td><td style="padding:8px;">${email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Phone</td><td style="padding:8px;">${phone || '—'}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Firm</td><td style="padding:8px;">${firm_name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Bar #</td><td style="padding:8px;">${bar_number || '—'}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">States</td><td style="padding:8px;">${(states_licensed || []).join(', ') || '—'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">Practice Areas</td><td style="padding:8px;">${(practice_areas || []).join(', ') || '—'}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Experience</td><td style="padding:8px;">${years_experience || 0} years</td></tr>
          </table>
          ${bio ? `<div style="margin-top:16px;"><strong>Bio:</strong><p style="color:#555;">${bio}</p></div>` : ''}
          <div style="margin-top:24px;">
            <a href="https://taylormadelaw.com/AdminNetworkReview" style="background:#3a164d;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Review Application</a>
          </div>
        </div>
      `
    );

    return Response.json({ success: true, application_id: application.id });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});