import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { circle_id, message_text, circle_name } = await req.json();
    if (!circle_id || !message_text) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get all active members except the sender
    const members = await base44.asServiceRole.entities.LegalCircleMember.filter({
      circle_id,
      status: 'active'
    });

    const otherMembers = members.filter(m => m.user_id !== user.id);
    if (otherMembers.length === 0) {
      return Response.json({ notified: 0 });
    }

    const circleName = circle_name || 'your Legal Circle';
    const senderName = user.full_name || user.email;
    const preview = message_text.length > 120 ? message_text.substring(0, 120) + '...' : message_text;

    // Create in-app notifications + send emails in parallel
    const notificationPromises = otherMembers.map(member =>
      base44.asServiceRole.entities.CircleNotification.create({
        user_id: member.user_id,
        user_email: member.user_email,
        circle_id,
        type: 'new_message',
        title: `New message in ${circleName}`,
        body: `${senderName}: ${preview}`,
        link: `/GroupDetail?id=${circle_id}`,
        is_read: false,
        reference_id: null
      }).catch(() => null)
    );

    await Promise.all(notificationPromises);

    // Send emails if Resend is configured
    if (RESEND_API_KEY) {
      const emailPromises = otherMembers
        .filter(m => m.user_email)
        .map(member => {
          const html = `
            <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
              <div style="background:linear-gradient(135deg,#3a164d,#5a2a6d);padding:24px 32px;">
                <img src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png" alt="Taylor Made Law" style="height:40px;" />
              </div>
              <div style="padding:32px;">
                <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">New message in <strong>${circleName}</strong></h2>
                <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">From <strong>${senderName}</strong></p>
                <div style="background:#f9fafb;border-left:4px solid #3a164d;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
                  <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">${preview}</p>
                </div>
                <a href="https://app.taylormadelaw.com/GroupDetail?id=${circle_id}" style="display:inline-block;background:#3a164d;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">View Circle</a>
                <p style="margin-top:24px;color:#9ca3af;font-size:12px;">You're receiving this because you're a member of this Legal Circle. To manage notifications, visit your settings.</p>
              </div>
            </div>
          `;

          return fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Taylor Made Law <notifications@taylormadelaw.com>',
              to: [member.user_email],
              subject: `New message in ${circleName}`,
              html
            })
          }).catch(() => null);
        });

      await Promise.all(emailPromises);
    }

    return Response.json({ notified: otherMembers.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});