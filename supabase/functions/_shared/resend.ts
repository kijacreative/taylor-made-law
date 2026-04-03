/**
 * Shared Resend email client for Edge Functions.
 *
 * Usage:
 *   import { sendEmail } from '../_shared/resend.ts';
 *   await sendEmail({ to: 'user@example.com', subject: '...', html: '...' });
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const DEFAULT_FROM = 'Taylor Made Law <noreply@taylormadelaw.com>';

interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from = DEFAULT_FROM }: EmailParams) {
  if (!RESEND_API_KEY) {
    console.warn('[resend] RESEND_API_KEY not set — email skipped');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[resend] Send failed:', err);
    return { success: false, error: err };
  }

  return { success: true, data: await res.json() };
}
