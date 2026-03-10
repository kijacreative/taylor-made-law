/**
 * DEPRECATED: submitLawyerApplication
 * ============================================================
 * This function is no longer called from the frontend.
 * The canonical onboarding flow (pages/JoinNetwork) now calls
 * functions/applyToNetwork directly.
 *
 * This stub is kept for backward compatibility only in case any
 * external integrations or old email links still invoke it.
 * All calls are forwarded to applyToNetwork.
 *
 * DO NOT add new logic here. Update functions/applyToNetwork instead.
 * ============================================================
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Forward all fields to the canonical applyToNetwork function
    const res = await base44.functions.invoke('applyToNetwork', {
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      firm_name: body.firm_name,
      bar_number: body.bar_number,
      years_experience: body.years_experience,
      states_licensed: body.states_licensed,
      practice_areas: body.practice_areas,
      bio: body.bio,
      referrals: body.referrals,
      consent_terms: body.consent_terms,
      consent_referral: body.consent_referral,
    });

    return Response.json({
      ...res,
      _deprecated: true,
      _note: 'This endpoint is deprecated. Use applyToNetwork instead.'
    });
  } catch (error) {
    console.error('submitLawyerApplication (deprecated) error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});