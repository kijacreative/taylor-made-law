import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2, Shield } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

export default function LawyerLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [disabledBlock, setDisabledBlock] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const activated = urlParams.get('activated') === '1';

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (auth) {
        try {
          const userData = await base44.auth.me();
          if (userData.role === 'admin') {
            navigate(createPageUrl('AdminDashboard'), { replace: true });
          } else {
            if (userData.user_status === 'disabled') {
              await base44.auth.logout();
              setCheckingAuth(false);
              setDisabledBlock(true);
              return;
            }
            navigate(createPageUrl('LawyerDashboard'), { replace: true });
          }
        } catch {
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    });
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.toLowerCase().trim(), password);

      const userData = await base44.auth.me();

      if (userData.user_status === 'disabled') {
        await base44.auth.logout();
        setDisabledBlock(true);
        return;
      }

      if (userData.role === 'admin') {
        await base44.auth.logout();
        setError('This portal is for attorneys only. Admins must use the admin portal.');
        return;
      }

      await base44.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: userData.id,
        action: 'login_success',
        actor_email: userData.email,
        actor_role: 'user',
        notes: 'Successful login'
      }).catch(() => {});

      navigate(createPageUrl('LawyerDashboard'), { replace: true });
    } catch (err) {
      const msg = (err.response?.data?.error || err.response?.data?.message || err.message || '').toLowerCase();
      if (msg.includes('disabled') || msg.includes('blocked')) {
        setDisabledBlock(true);
      } else if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('password') || msg.includes('credentials') || msg.includes('not found') || msg.includes('wrong')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
              <p className="text-gray-600 mb-6">
                Your access to the Taylor Made Law Network has been temporarily disabled.
                If you believe this is an error, please contact us.
              </p>
              <a
                href="mailto:support@taylormadelaw.com"
                className="inline-block bg-[#3a164d] text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-[#2a1038] transition-colors"
              >
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
          transition={{ duration: 0.5 }}
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
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Account activated!</p>
                <p className="text-sm text-emerald-700">Your password has been set. Please log in below.</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleLoginSubmit} className="space-y-5">
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to={createPageUrl('ForgotPassword')} className="text-sm text-[#3a164d] hover:underline font-medium">
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
                <Link to={createPageUrl('JoinNetwork')} className="text-[#3a164d] font-semibold hover:underline">
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