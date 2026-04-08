import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { MOCK_USER_DATA, MOCK_PUBLIC_SETTINGS } from '@/api/base44MockClient.js';

const AuthContext = createContext();

// Check which auth provider is active (trim to handle Vercel CLI \n suffix)
const AUTH_PROVIDER = (import.meta.env.VITE_PROVIDER_AUTH || 'base44').trim();
const USE_SUPABASE_AUTH = AUTH_PROVIDER === 'supabase';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  // =========================================================================
  // Supabase Auth Path
  // =========================================================================

  const checkAppStateSupabase = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const sb = getSupabase();
      if (!sb) {
        setAuthError({ type: 'unknown', message: 'Supabase client not available' });
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        return;
      }

      // No public settings API needed with Supabase — set stub
      setAppPublicSettings({ id: 'supabase', public_settings: {} });
      setIsLoadingPublicSettings(false);

      // Check session
      const { data: { session }, error: sessionError } = await sb.auth.getSession();

      if (sessionError) {
        console.error('Supabase session check failed:', sessionError);
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      if (!session) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      // Fetch profile to get role, status, etc.
      const { data: profile, error: profileError } = await sb
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile fetch failed:', profileError);
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthError({ type: 'user_not_registered', message: 'Profile not found' });
        return;
      }

      // Merge auth user + profile into the shape pages expect
      setUser({
        ...profile,
        id: session.user.id,
        email: session.user.email || profile.email,
      });
      setIsAuthenticated(true);
      setIsLoadingAuth(false);

      // Listen for auth state changes (token refresh, logout in other tab)
      sb.auth.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          // Session refreshed — user is still valid
        } else if (event === 'SIGNED_IN' && newSession) {
          // Re-fetch profile on sign-in (e.g., from another tab)
          sb.from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single()
            .then(({ data: p, error: fetchErr }) => {
              if (fetchErr) {
                // Non-fatal — initial auth already succeeded
                console.debug('[auth] Profile re-fetch skipped:', fetchErr.message);
                return;
              }
              if (p) {
                setUser({ ...p, id: newSession.user.id, email: newSession.user.email || p.email });
                setIsAuthenticated(true);
              }
            });
        }
      });

      // Clean up stale Base44 tokens
      try {
        localStorage.removeItem('base44_access_token');
        localStorage.removeItem('base44_app_id');
      } catch {}

    } catch (error) {
      console.error('Supabase auth unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'Auth check failed' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  // =========================================================================
  // Base44 Auth Path (original, unchanged)
  // =========================================================================

  const checkAppStateBase44 = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // --- Mock mode: skip all Base44 API calls, set mock user immediately ---
      if (import.meta.env.VITE_USE_MOCKS === 'true') {
        setAppPublicSettings(MOCK_PUBLIC_SETTINGS);
        setUser(MOCK_USER_DATA);
        setIsAuthenticated(true);
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        return;
      }
      // --- End mock mode ---

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await checkUserAuthBase44();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          setAuthError({
            type: reason === 'auth_required' ? 'auth_required'
              : reason === 'user_not_registered' ? 'user_not_registered'
              : reason,
            message: appError.message || reason,
          });
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuthBase44 = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  // =========================================================================
  // Router: pick auth path based on provider flag
  // =========================================================================

  const checkAppState = USE_SUPABASE_AUTH ? checkAppStateSupabase : checkAppStateBase44;

  const logout = async (redirectUrl) => {
    setUser(null);
    setIsAuthenticated(false);

    if (USE_SUPABASE_AUTH) {
      const sb = getSupabase();
      if (sb) await sb.auth.signOut();
    }

    // Always clear local token regardless of provider
    try { localStorage.removeItem('base44_access_token'); } catch {}

    // Redirect to provided URL or default login page
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
