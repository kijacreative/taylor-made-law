import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
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

  const urlParams = new URLSearchParams(window.location.search);
  const activated = urlParams.get('activated') === '1';

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (auth) navigate(createPageUrl('LawyerDashboard'), { replace: true });
      else setCheckingAuth(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.login({ email: email.toLowerCase().trim(), password });
      navigate(createPageUrl('LawyerDashboard'), { replace: true });
    } catch (err) {
      setError('Invalid email or password. Please try again.');
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
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp"
              alt="Taylor Made Law"
              className="h-14 mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900">Attorney Portal</h1>
            <p className="text-gray-500 mt-2">Sign in to access your dashboard</p>
          </div>

          {/* Activated success banner */}
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

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <TMLInput
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourfirm.com"
                autoComplete="email"
              />

              <div className="relative">
                <TMLInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link
                  to={createPageUrl('ForgotPassword')}
                  className="text-sm text-[#3a164d] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <TMLButton
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
              >
                Sign In
              </TMLButton>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
              <p className="text-sm text-gray-500">
                Not yet a member?{' '}
                <Link to={createPageUrl('ForLawyers')} className="text-[#3a164d] font-semibold hover:underline">
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