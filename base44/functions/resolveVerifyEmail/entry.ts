/**
 * resolveVerifyEmail — looks up an ActivationToken by raw token value
 * and returns the associated email. Does NOT require the token to be unused.
 * Used by the VerifyEmail page to recover the correct email from the token
 * even after registerActivation has marked it used.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'token is required' }, { status: 400 });
    }

    // Hash the raw token to look up the record
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('resolveVerifyEmail: looking up token hash', tokenHash.slice(0, 12) + '...');

    const records = await base44.asServiceRole.entities.ActivationToken.filter({ token_hash: tokenHash });

    if (!records || records.length === 0) {
      console.log('resolveVerifyEmail: token not found');
      return Response.json({ error: 'Token not found or invalid.' }, { status: 404 });
    }

    const record = records[0];
    console.log('resolveVerifyEmail: found record for email', record.user_email);

    // Check expiry
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return Response.json({ error: 'Token has expired.' }, { status: 410 });
    }

    return Response.json({ email: record.user_email });

  } catch (error) {
    console.error('resolveVerifyEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});