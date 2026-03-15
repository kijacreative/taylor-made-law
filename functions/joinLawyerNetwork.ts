/**
 * joinLawyerNetwork — Self-signup flow for Option 2 (Auto-approve first, review later).
 * 1. Validates all inputs
 * 2. Creates LawyerApplication record (for admin review later)
 * 3. Registers Base44 auth account (Base44 sends OTP verification email automatically)
 * 4. Syncs profile data to User entity
 * 5. Sends admin notification email
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LOGO = 'https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png';
const BASE_URL = 'https://app.taylormadelaw.com';
const YEAR = new Date().getFullYear();

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f1ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ee;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td style="text-align:center;padding-bottom:28px;">
        <img src="${LOGO}" width="200" alt="Taylor Made Law" style="width:200px;height:auto;display:block;margin:0 auto;" />
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:16px;padding:40px 48px;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        ${content}
      </td></tr>
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;text-decoration:none;">support@taylormadelaw.com</a></p>
        <p style="margin:8px 0 0;color:#bbb;font-size:11px;">© ${YEAR} Taylor Made Law. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { full_name, email, phone, firm_name, bar_number, states_licensed, practice_areas, years_experience, bio, password } = body;

    // Validate required fields
    if (!full_name || !email || !phone || !firm_name || !bar_number || !password) {
      return Response.json({ error: 'All required fields must be filled.' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!states_licensed?.length) {
      return Response.json({ error: 'Please select at least one state.' }, { status: 400 });
    }
    if (!practice_areas?.length) {
      return Response.json({ error: 'Please select at least one practice area.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const firstName = full_name.split(' ')[0] || 'there';
    const resendKey = Deno.env.get('RESEND_API_KEY');

    // Check if already registered (User entity)
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail }).catch(() => []);
    if (existingUsers.length > 0) {
      return Response.json({ error: 'An account with this email already exists. Please sign in.', already_exists: true }, { status: 400 });
    }

    // Check existing application
    const existingApps = await base44.asServiceRole.entities.LawyerApplication.filter({ email: normalizedEmail }).catch(() => []);
    if (existingApps.length > 0) {
      return Response.json({ error: 'An application with this email already exists.', already_exists: true }, { status: 400 });
    }

    // Create LawyerApplication record for admin review
    const appRecord = await base44.asServiceRole.entities.LawyerApplication.create({
      full_name,
      email: normalizedEmail,
      phone,
      firm_name,
      bar_number,
      states_licensed: states_licensed || [],
      practice_areas: practice_areas || [],
      years_experience: years_experience || 0,
      bio: bio || '',
      status: 'pending',
      consent_terms: true,
    });

    console.log('joinLawyerNetwork: created LawyerApplication', appRecord.id, 'for', normalizedEmail);

    // Send confirmation email to the applicant
    if (resendKey) {
      const applicantHtml = emailWrapper(`
        <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Application Received, ${firstName}!</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Thank you for applying to join the Taylor Made Law Attorney Network. We've received your application and our team is reviewing it.</p>
        <div style="background:#f5f0fa;border-radius:12px;padding:20px;margin:0 0 24px;">
          <p style="margin:0 0 6px;color:#3a164d;font-size:14px;font-weight:600;">What happens next:</p>
          <p style="margin:4px 0;color:#374151;font-size:14px;">1. Our team will review your application (usually within 1 business day)</p>
          <p style="margin:4px 0;color:#374151;font-size:14px;">2. You'll receive an email with a link to set up your account</p>
          <p style="margin:4px 0;color:#374151;font-size:14px;">3. Once your account is active, you can start browsing cases immediately</p>
        </div>
        <p style="margin:0;color:#6b7280;font-size:14px;">Questions? Reply to this email or contact <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;">support@taylormadelaw.com</a></p>
      `);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: [normalizedEmail],
          subject: 'Your Application to Taylor Made Law — We\'ll Be in Touch!',
          html: applicantHtml
        })
      }).catch(e => console.warn('Applicant confirmation email failed:', e.message));
    }

    console.log('joinLawyerNetwork: application submitted for', normalizedEmail, '— awaiting admin review/invite');

    // Send admin notification
    if (resendKey) {
      const adminHtml = emailWrapper(`
        <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">New Attorney Joined — Review Needed</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">A new attorney has joined the Taylor Made Law Network and needs review.</p>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Name:</strong> ${full_name}</p>
          <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Email:</strong> ${normalizedEmail}</p>
          <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Firm:</strong> ${firm_name}</p>
          <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Bar #:</strong> ${bar_number}</p>
          <p style="margin:0 0 0;color:#374151;font-size:14px;"><strong>States:</strong> ${(states_licensed || []).join(', ')}</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${BASE_URL}/AdminNetworkReview" style="display:inline-block;background-color:#3a164d;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Review in Admin Portal →</a>
          </td></tr>
        </table>
      `);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Taylor Made Law <noreply@taylormadelaw.com>',
          to: ['support@taylormadelaw.com'],
          subject: `New Attorney Joined — Review Needed: ${full_name}`,
          html: adminHtml
        })
      }).catch(e => console.warn('Admin notification email failed:', e.message));
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: normalizedEmail,
      action: 'lawyer_joined',
      actor_email: normalizedEmail,
      actor_role: 'user',
      notes: `New attorney self-signup: ${full_name} (${firm_name}). LawyerApplication: ${appRecord.id}`
    }).catch(() => {});

    return Response.json({ success: true, email: normalizedEmail });

  } catch (error) {
    console.error('joinLawyerNetwork error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});