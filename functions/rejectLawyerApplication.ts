import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { application_id, rejection_reason } = body;

    if (!application_id) {
      return Response.json({ error: 'application_id is required' }, { status: 400 });
    }

    const apps = await base44.asServiceRole.entities.LawyerApplication.filter({ id: application_id });
    if (!apps || apps.length === 0) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }
    const application = apps[0];

    await base44.asServiceRole.entities.LawyerApplication.update(application_id, {
      status: 'rejected',
      rejection_reason: rejection_reason || '',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString()
    });

    // Send rejection email
    const resendKey = Deno.env.get('RESEND_API_KEY');
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Taylor Made Law <noreply@taylormadelaw.com>',
        to: [application.email],
        subject: 'Update on Your Taylor Made Law Application',
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 44px;" />
            </div>
            <div style="background: white; border-radius: 16px; padding: 36px; border: 1px solid #e5e7eb;">
              <h2 style="color: #111827;">Application Status Update</h2>
              <p style="color: #374151;">Hi ${application.full_name},</p>
              <p style="color: #374151;">Thank you for your interest in joining the Taylor Made Law attorney network. After reviewing your application, we are unable to approve your membership at this time.</p>
              ${rejection_reason ? `<p style="color: #374151;"><strong>Reason:</strong> ${rejection_reason}</p>` : ''}
              <p style="color: #374151;">If you have questions, please contact <a href="mailto:support@taylormadelaw.com" style="color: #3a164d;">support@taylormadelaw.com</a>.</p>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 20px;">© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
          </div>
        `
      })
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error rejecting application:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});