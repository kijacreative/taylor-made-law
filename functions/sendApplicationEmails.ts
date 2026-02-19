import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { to, subject, body: emailBody, from_name } = body;

    if (!to || !subject || !emailBody) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${from_name || 'Taylor Made Law'} <noreply@taylormadelaw.com>`,
        to: [to],
        subject,
        html: emailBody
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('Resend error:', errData);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error sending application email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});