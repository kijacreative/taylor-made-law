/**
 * Auth service — wraps all authentication and profile-loading calls.
 *
 * Supports dual providers (Base44 / Supabase) via VITE_PROVIDER_AUTH flag.
 * Pages import from here — they never know which backend is active.
 *
 * User object shape is preserved regardless of provider:
 *   { id, email, full_name, role, user_type, user_status, membership_status, ... }
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { useSupabase, logProvider } from './provider';

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

/**
 * Get the current Supabase session user merged with their profiles row.
 * Returns the same shape as Base44's auth.me() — pages see no difference.
 */
async function supabaseGetCurrentUser() {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;

  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) return null;

  // Merge auth user + profile into the shape pages expect
  return {
    ...profile,
    id: session.user.id,
    email: session.user.email || profile.email,
  };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** Returns the current user object, or null if not authenticated. */
export async function getCurrentUser() {
  if (useSupabase('auth')) {
    logProvider('auth', 'getCurrentUser');
    return supabaseGetCurrentUser();
  }
  logProvider('auth', 'getCurrentUser', 'base44');
  const isAuth = await base44.auth.isAuthenticated();
  if (!isAuth) return null;
  return base44.auth.me();
}

/** Boolean check — thinner than getCurrentUser when you don't need the user object. */
export async function isAuthenticated() {
  if (useSupabase('auth')) {
    logProvider('auth', 'isAuthenticated');
    const sb = getSupabase();
    if (!sb) return false;
    const { data: { session } } = await sb.auth.getSession();
    return !!session;
  }
  logProvider('auth', 'isAuthenticated', 'base44');
  return base44.auth.isAuthenticated();
}

/** Returns full user object. Throws if not authenticated. */
export async function me() {
  if (useSupabase('auth')) {
    logProvider('auth', 'me');
    const user = await supabaseGetCurrentUser();
    if (!user) throw new Error('Not authenticated');
    return user;
  }
  logProvider('auth', 'me', 'base44');
  return base44.auth.me();
}

// ---------------------------------------------------------------------------
// Login / Logout
// ---------------------------------------------------------------------------

export async function login(email, password) {
  if (useSupabase('auth')) {
    logProvider('auth', 'login');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'login', 'base44');
  return base44.auth.loginViaEmailPassword(email, password);
}

export async function logout(redirectUrl) {
  if (useSupabase('auth')) {
    logProvider('auth', 'logout');
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  }
  // Always clear local token regardless of provider
  try { localStorage.removeItem('base44_access_token'); } catch {}
  if (redirectUrl) {
    window.location.href = redirectUrl;
  } else {
    window.location.href = '/login';
  }
}

export function redirectToLogin(returnUrl) {
  // Always redirect to our own login page (works on any host, including Vercel)
  window.location.href = '/login' + (returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '');
}

// ---------------------------------------------------------------------------
// OTP & Password
// ---------------------------------------------------------------------------

export async function verifyOtp({ email, otpCode }) {
  if (useSupabase('auth')) {
    logProvider('auth', 'verifyOtp');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'verifyOtp', 'base44');
  return base44.auth.verifyOtp({ email, otpCode });
}

export async function resendOtp(email) {
  if (useSupabase('auth')) {
    logProvider('auth', 'resendOtp');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data, error } = await sb.auth.resend({ type: 'signup', email });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'resendOtp', 'base44');
  return base44.auth.resendOtp(email);
}

export async function resetPassword({ resetToken, newPassword }) {
  if (useSupabase('auth')) {
    logProvider('auth', 'resetPassword');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    // Supabase password reset: user already has a session from the reset link
    const { data, error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'resetPassword', 'base44');
  return base44.auth.resetPassword({ resetToken, newPassword });
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** Update the current user's own record (name, profile_completed_at, etc.) */
export async function updateMe(updates) {
  if (useSupabase('auth')) {
    logProvider('auth', 'updateMe');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    // Update profiles row (not auth.users metadata)
    const { data, error } = await sb
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'updateMe', 'base44');
  return base44.auth.updateMe(updates);
}

/** Load a LawyerProfile by user_id. Returns the profile or null. */
export async function getProfile(userId) {
  if (useSupabase('profile_read')) {
    logProvider('profile_read', 'getProfile');
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('lawyer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }
  }
  logProvider('profile_read', 'getProfile', 'base44');
  const profiles = await base44.entities.LawyerProfile.filter({ user_id: userId });
  return profiles[0] || null;
}

// ---------------------------------------------------------------------------
// Platform user management (admin only in practice)
// ---------------------------------------------------------------------------

export async function inviteUser(email, role) {
  if (useSupabase('auth')) {
    logProvider('auth', 'inviteUser');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');
    // Use Edge Function for admin invite
    const { data, error } = await sb.functions.invoke('admin-lawyers', {
      body: { action: role === 'admin' ? 'invite_admin' : 'invite_attorney', email },
    });
    if (error) throw error;
    return data;
  }
  logProvider('auth', 'inviteUser', 'base44');
  return base44.users.inviteUser(email, role);
}
