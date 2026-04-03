/**
 * Onboarding service — signup, activation, email verification flows.
 */
import { base44 } from '@/api/base44Client';

// ---------------------------------------------------------------------------
// Public signup
// ---------------------------------------------------------------------------

export function publicLawyerSignup(payload) {
  return base44.functions.invoke('publicLawyerSignup', payload);
}

export function submitLawyerApplication(payload) {
  return base44.functions.invoke('submitLawyerApplication', payload);
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export function activateAccount(payload) {
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

export function createSubscriptionCheckout(payload) {
  return base44.functions.invoke('createSubscriptionCheckout', payload);
}

export function createSetupIntent(payload) {
  return base44.functions.invoke('createSetupIntent', payload);
}
