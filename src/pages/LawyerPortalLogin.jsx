/**
 * LawyerPortalLogin — TML-branded attorney login page.
 * Route: /login
 *
 * On success:
 *   - onboarding incomplete → /LawyerOnboarding
 *   - onboarding complete   → /LawyerDashboard
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2, Shield, CheckCircle2 } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

const parseLoginError = (err) => {
  const raw = (err?.response?.data?.error || err?.response?.data?.message || err?.message || '').toLowerCase();
  if (raw.includes('disabled') || raw.includes('blocked')) return '__disabled__';
  if (raw.includes('verify') || raw.includes('verification') || raw.includes('not confirmed') || raw.includes('confirmed')) return '__unverified__';
  if (raw.includes('invalid') || raw.includes('incorrect') || raw.includes('password') || raw.includes('credentials') || raw.includes('not found') || raw.includes('wrong')) {
    return 'Invalid email or password. Please try again.';
  }
  const friendly = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
  return (typeof friendly === 'string' && !friendly.includes('[object') && friendly.length < 300)
    ? friendly
    : 'Login failed. Please try again.';
};

export default function LawyerPortalLogin() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const activated = urlParams.get('activated') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [disabledBlock, setDisabledBlock] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (auth) {
        try {
          const user = await base44.auth.me();
          routeAfterLogin(user);
        } catch {
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    });
  }, []);

  const routeAfterLogin = (user) => {
    if (user.role === 'admin') {
      navigate('/AdminDashboard', { replace: true });
      return;
    }
    if (!user.profile_completed_at) {
      navigate('/app/onboarding', { replace: true });
    } else {
      navigate('/app/dashboard', { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      const user = await base44.auth.me();

      if (user.user_status === 'disabled') {
        await base44.auth.logout();
        setDisabledBlock(true);
        return;
      }

      base44.entities.AuditLog.create({
        entity_type: 'User', entity_id: user.id,
        action: 'login_success', actor_email: user.email,
        actor_role: user.role || 'user', notes: 'Login via /login',
      }).catch(() => {});

      routeAfterLogin(user);
    } catch (err) {
      const parsed = parseLoginError(err);
      if (parsed === '__disabled__') {
        setDisabledBlock(true);
      } else if (parsed === '__unverified__') {
        setError('Please verify your email before logging in. Check your inbox for a verification code from Taylor Made Law.');
      } else {
        setError(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  if (disabledBlock) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Disabled</h2>
              <p className="text-gray-600 mb-6">Your access has been temporarily disabled. Please contact us if you believe this is an error.</p>
              <a href="mailto:support@taylormadelaw.com"
                className="inline-block bg-[#3a164d] text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-[#2a1038] transition-colors">
                Contact Support
              </a>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="flex items-center justify-center min-h-screen px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
              alt="Taylor Made Law"
              className="h-14 mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900">Attorney Portal</h1>
            <p className="text-gray-500 mt-2">Sign in to access your dashboard</p>
          </div>

          {activated && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Your account has been activated successfully.</p>
                <p className="text-sm text-emerald-700">Please log in to continue.</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <TMLInput
                label="Email Address" type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@yourfirm.com" autoComplete="email"
              />
              <div className="relative">
                <TMLInput
                  label="Password" type={showPassword ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to="/ForgotPassword" className="text-sm text-[#3a164d] hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <TMLButton type="submit" variant="primary" className="w-full" loading={loading}>
                Sign In
              </TMLButton>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
              <p className="text-sm text-gray-500">
                Not yet a member?{' '}
                <Link to="/join-lawyer-network" className="text-[#3a164d] font-semibold hover:underline">
                  Apply to join the network
                </Link>
              </p>
              <p className="text-xs text-gray-400">
                Need help?{' '}
                <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">
                  support@taylormadelaw.com
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      <PublicFooter />
    </div>
  );
}