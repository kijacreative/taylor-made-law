import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invitee_email, invitee_name, circle_name, circle_id, message, is_network_member } = await req.json();

    if (!invitee_email || !circle_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const senderName = user.full_name || user.email;

    if (!RESEND_API_KEY) {
      return Response.json({ sent: false, reason: 'No email configured' });
    }

    let subject, html;

    if (is_network_member) {
      // Invite existing TML network member to the circle
      subject = `You've been invited to join "${circle_name}" on Taylor Made Law`;
      html = `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#3a164d,#5a2a6d);padding:24px 32px;">
            <img src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png" alt="Taylor Made Law" style="height:40px;" />
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">You've been invited to a Legal Circle</h2>
            <p style="color:#6b7280;font-size:15px;margin-bottom:20px;">
              <strong>${senderName}</strong> has invited you to join <strong>${circle_name}</strong> on the Taylor Made Law Network.
            </p>
            ${message ? `
            <div style="background:#f9fafb;border-left:4px solid #3a164d;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
              <p style="margin:0;color:#374151;font-size:14px;font-style:italic;">"${message}"</p>
            </div>` : ''}
            <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">Log in to your dashboard to accept or decline this invitation.</p>
            <a href="https://app.taylormadelaw.com/GroupInvitations" style="display:inline-block;background:#3a164d;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">View Invitation</a>
            <p style="margin-top:24px;color:#9ca3af;font-size:12px;">Taylor Made Law Network · Attorney Referral Platform</p>
          </div>
        </div>
      `;
    } else {
      // Non-member — invite them to join TML network
      subject = `${senderName} invited you to join the Taylor Made Law Network`;
      html = `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#3a164d,#5a2a6d);padding:24px 32px;">
            <img src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png" alt="Taylor Made Law" style="height:40px;" />
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">You've been invited to join the Taylor Made Law Network</h2>
            <p style="color:#6b7280;font-size:15px;margin-bottom:16px;">
              <strong>${senderName}</strong> wants to connect with you${invitee_name ? `, ${invitee_name},` : ''} on the Taylor Made Law attorney referral platform — and invited you to join the <strong>${circle_name}</strong> Legal Circle.
            </p>
            ${message ? `
            <div style="background:#f9fafb;border-left:4px solid #3a164d;padding:14px 18px;border-radius:8px;margin-bottom:20px;">
              <p style="margin:0;color:#374151;font-size:14px;font-style:italic;">"${message}"</p>
            </div>` : ''}
            <div style="background:#faf8f5;border-radius:10px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 10px;font-weight:600;color:#111827;font-size:14px;">Why join Taylor Made Law?</p>
              <ul style="margin:0;padding-left:18px;color:#6b7280;font-size:14px;line-height:2;">
                <li>Access to quality case referrals</li>
                <li>Collaborate in private Legal Circles</li>
                <li>Grow your practice network</li>
              </ul>
            </div>
            <a href="https://app.taylormadelaw.com/JoinNetwork" style="display:inline-block;background:#3a164d;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">Apply to Join the Network</a>
            <p style="margin-top:24px;color:#9ca3af;font-size:12px;">Taylor Made Law Network · Attorney Referral Platform</p>
          </div>
        </div>
      `;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Taylor Made Law <notifications@taylormadelaw.com>',
        to: [invitee_email],
        subject,
        html
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json({ sent: false, error: data.message }, { status: 200 });
    }

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});