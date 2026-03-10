import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';

export default function ResetPassword() {
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [expired, setExpired] = useState(false);
  const [expiredEmail, setExpiredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // No token in URL — show a clear TML error
  if (!token) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
              <p className="text-gray-600 mb-6">
                This reset link is missing required information. Please use the link directly from your email,
                or request a new one.
              </p>
              <Link to={createPageUrl('ForgotPassword')}>
                <TMLButton variant="primary" className="w-full">Request a New Reset Link</TMLButton>
              </Link>
              <div className="mt-4">
                <Link to={createPageUrl('LawyerLogin')} className="text-sm text-[#3a164d] hover:underline">
                  Back to Login
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const handleResend = async () => {
    if (!expiredEmail) return;
    setResending(true);
    try {
      await base44.functions.invoke('sendPasswordReset', { email: expiredEmail });
      setResendSuccess(true);
    } catch (err) {
      setResendSuccess(true); // Still show success (prevent enumeration)
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[0-9]/.test(password)) { setError('Password must include at least one number'); return; }
    if (!/[a-zA-Z]/.test(password)) { setError('Password must include at least one letter'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('resetPassword', { token, password });
      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => navigate(createPageUrl('LawyerLogin') + '?reset=1', { replace: true }), 2500);
      } else if (res.data?.expired) {
        setExpired(true);
        setExpiredEmail(res.data?.user_email || '');
      } else {
        setError(res.data?.error || 'Reset failed. Please try again or request a new link.');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.expired) {
        setExpired(true);
        setExpiredEmail(data?.user_email || '');
      } else if (data?.invalid) {
        setError('This reset link is invalid or has already been used. Please request a new one.');
      } else {
        setError(data?.error || err.message || 'Reset failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Expired token screen
  if (expired) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Link Expired</h2>
              <p className="text-gray-600 mb-6">
                This link has expired (links are valid for 1 hour).
                {expiredEmail && <> We'll send a fresh link to <strong>{expiredEmail}</strong>.</>}
              </p>
              {resendSuccess ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  New reset link sent! Check your inbox.
                </div>
              ) : (
                <TMLButton variant="primary" className="w-full mb-3" loading={resending} onClick={handleResend}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send New Reset Link
                </TMLButton>
              )}
              <Link to={createPageUrl('ForgotPassword')} className="text-sm text-[#3a164d] hover:underline block mt-2">
                Enter a different email
              </Link>
              <p className="text-xs text-gray-500 mt-4">
                Need help? <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">Contact Support</a>
              </p>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-600 mb-4">Your password has been updated. Redirecting to login...</p>
              <Loader2 className="w-6 h-6 animate-spin text-[#3a164d] mx-auto" />
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Main reset form
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
            <h1 className="text-3xl font-bold text-gray-900">Create New Password</h1>
            <p className="text-gray-500 mt-2">Choose a strong password for your account</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {error && (
              <div className="mb-5 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-red-800">{error}</p>
                  {error.includes('invalid') || error.includes('already been used') ? (
                    <Link to={createPageUrl('ForgotPassword')} className="text-sm text-red-700 underline font-medium mt-1 block">
                      Request a new reset link →
                    </Link>
                  ) : null}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <TMLInput
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars, letters & numbers"
                  helperText="At least 8 characters with letters and numbers"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <TMLInput
                  label="Confirm Password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <TMLButton type="submit" variant="primary" className="w-full" loading={loading}>
                Set New Password
              </TMLButton>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <Link
                to={createPageUrl('LawyerLogin')}
                className="text-sm text-[#3a164d] font-medium hover:underline flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Need help?{' '}
            <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">
              support@taylormadelaw.com
            </a>
          </p>
        </motion.div>
      </div>
      <PublicFooter />
    </div>
  );
}