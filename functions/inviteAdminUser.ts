import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Invite the user via platform (creates account / sends platform invite)
    await base44.users.inviteUser(email.trim().toLowerCase(), 'admin');

    // Send a custom branded email with the correct redirect
    const appUrl = 'https://preview-sandbox--6976c161df20214df3a08053.base44.app/AdminDashboard';

    await resend.emails.send({
      from: 'Taylor Made Law <noreply@taylormadelaw.com>',
      to: email.trim().toLowerCase(),
      subject: "You've been invited to the Taylor Made Law Admin Portal",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/cropped-TML-concierge.png" alt="Taylor Made Law" style="height: 60px; width: auto;" />
          </div>
          <h1 style="color: #3a164d; font-size: 24px; margin-bottom: 16px;">You've been invited as an Admin</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            ${user.full_name || 'An administrator'} has invited you to manage the Taylor Made Law platform as an administrator.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            You should receive a separate email from the platform to set your password. Once your password is set, click the button below to access the Admin Portal.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}" style="background-color: #3a164d; color: white; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
              Go to Admin Portal
            </a>
          </div>
          <p style="color: #999; font-size: 13px; text-align: center;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('inviteAdminUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});