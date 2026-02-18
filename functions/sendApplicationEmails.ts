import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, to, subject, body: emailBody, from_name } = body;

    if (!to || !subject || !emailBody) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      from_name: from_name || 'Taylor Made Law Network',
      subject,
      body: emailBody
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error sending application email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});