/**
 * joinNetwork — DEPRECATED / LEGACY
 * This endpoint previously auto-approved attorneys on signup.
 * It now redirects to the Option C flow (applyToNetwork) which sets status=pending
 * and sends an activation email instead of immediately logging in.
 *
 * Kept for backward compatibility. Any existing calls will be forwarded.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Forward to the new unified applyToNetwork endpoint
    const res = await base44.functions.invoke('applyToNetwork', {
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      firm_name: body.firm_name,
      bar_number: body.bar_number,
      states_licensed: body.states_licensed,
      practice_areas: body.practice_areas,
    });

    if (res?.success !== false) {
      return Response.json({
        success: true,
        legacy_redirected: true,
        message: 'Application submitted. Check your email to activate your account.',
        ...(res || {})
      });
    }

    return Response.json(res, { status: 400 });
  } catch (error) {
    console.error('joinNetwork (legacy) error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});