/**
 * Onboarding service — signup, activation, email verification flows.
 *
 * Supports dual providers (Base44 / Supabase) via VITE_PROVIDER_AUTH flag.
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// Public signup
// ---------------------------------------------------------------------------

export async function publicLawyerSignup(payload) {
  if (useSupabase('auth')) {
    logProvider('auth', 'publicLawyerSignup');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');

    // Call the edge function directly via fetch to get proper error handling.
    // sb.functions.invoke() throws on non-2xx which loses the error body.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${supabaseUrl}/functions/v1/auth-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ action: 'signup', ...payload }),
    });
    const json = await res.json();

    // Return the response body — caller checks json.data.success / json.error_code
    return json;
  }
  logProvider('auth', 'publicLawyerSignup', 'base44');
  return base44.functions.invoke('publicLawyerSignup', payload);
}

export async function submitLawyerApplication(payload) {
  if (useSupabase('auth')) {
    logProvider('auth', 'submitLawyerApplication');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('auth-signup', {
      body: { action: 'apply', ...payload },
    });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'submitLawyerApplication', 'base44');
  return base44.functions.invoke('submitLawyerApplication', payload);
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export async function activateAccount(payload) {
  if (useSupabase('auth')) {
    logProvider('auth', 'activateAccount');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('auth-signup', {
      body: { action: 'activate', ...payload },
    });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'activateAccount', 'base44');
  return base44.functions.invoke('activateAccount', payload);
}

export function resendActivation(payload) {
  return base44.functions.invoke('resendActivation', payload);
}

// ---------------------------------------------------------------------------
// Email verification (OTP)
// ---------------------------------------------------------------------------

export function sendEmailOtp(payload) {
  return base44.functions.invoke('sendEmailOtp', payload);
}

export function verifyEmailOtp(payload) {
  return base44.functions.invoke('verifyEmailOtp', payload);
}

// ---------------------------------------------------------------------------
// Stripe (subscription checkout from settings/onboarding)
// ---------------------------------------------------------------------------

export async function createSubscriptionCheckout(payload) {
  if (useSupabase('auth')) {
    logProvider('auth', 'createSubscriptionCheckout');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('stripe', {
      body: { action: 'create_checkout', ...payload },
    });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'createSubscriptionCheckout', 'base44');
  return base44.functions.invoke('createSubscriptionCheckout', payload);
}

export async function createSetupIntent(payload) {
  if (useSupabase('auth')) {
    logProvider('auth', 'createSetupIntent');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.functions.invoke('stripe', {
      body: { action: 'create_setup_intent', ...payload },
    });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'createSetupIntent', 'base44');
  return base44.functions.invoke('createSetupIntent', payload);
}
