/**
 * VerifyEmail — TML-branded Base44 email verification page.
 * Route: /verify-email (and /VerifyEmail for legacy links)
 *
 * Accepts email (from URL param or manual entry) + Base44 OTP code.
 * On success → /set-password
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';

const parseError = (err) => {
  // Prevent [object Object] from ever showing
  if (!err) return "We couldn't verify your code. Please try again.";

  // Base44 validation errors (array of detail objects)
  if (Array.isArray(err?.data?.detail) && err.data.detail.length > 0) {
    const fields = err.data.detail.map(e => e.loc?.[e.loc.length - 1]);
    if (fields.includes('otp_code')) return 'Please enter your verification code.';
    if (fields.includes('email')) return 'Your email is missing from the verification request. Please return to the previous step and try again.';
    const msg = err.data.detail[0]?.msg;
    return (typeof msg === 'string' ? msg : null) || "We couldn't verify your code. Please try again.";
  }

  // String error messages
  const raw = typeof err?.data?.error === 'string' ? err.data.error
    : typeof err?.data?.message === 'string' ? err.data.message
    : typeof err?.message === 'string' ? err.message
    : '';

  const lower = raw.toLowerCase();
  if (lower.includes('expired')) return 'This verification code has expired. Please request a new one.';
  if (lower.includes('invalid') || lower.includes('incorrect') || lower.includes('wrong') || lower.includes('mismatch')) {
    return 'The verification code is invalid. Please try again.';
  }
  if (raw && !raw.includes('[object')) return raw;

  return "We couldn't verify your code. Please try again.";
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);

  const [email, setEmail] = useState(urlParams.get('email') || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resentMsg, setResentMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setResentMsg('');

    if (!email.trim()) {
      setError('Your email is missing from the verification request. Please return to the previous step and try again.');
      return;
    }
    if (!code || code.length !== 6) {
      setError('Please enter your verification code.');
      return;
    }

    setLoading(true);
    try {
      await base44.auth.verifyOtp(email.trim(), code.trim());
      setSuccess(true);
      setTimeout(() => navigate('/set-password', { replace: true }), 1200);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please enter your email address before requesting a new code.');
      return;
    }
    setResending(true);
    setError('');
    setResentMsg('');
    try {
      await base44.auth.resendOtp(email.trim());
      setResentMsg(`A new code has been sent to ${email.trim()}.`);
    } catch (err) {
      setError(parseError(err) || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl text-center p-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-4">Redirecting you to set your password...</p>
              <Loader2 className="w-6 h-6 animate-spin text-[#3a164d] mx-auto" />
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
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                <Mail className="w-7 h-7 text-[#3a164d]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
              <p className="text-gray-500 mt-2 text-sm">
                Enter the verification code sent to your email to activate your account.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {resentMsg && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-emerald-800">{resentMsg}</p>
                </div>
              )}

              <TMLInput
                label="Email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
              />

              <TMLInput
                label="Verification Code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                autoFocus={!!email}
                helperText="Check your inbox and spam folder for the code."
              />

              <TMLButton type="submit" variant="primary" className="w-full" loading={loading}>
                Verify Email
              </TMLButton>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full text-sm text-[#3a164d] hover:underline flex items-center justify-center gap-1.5 py-1 disabled:opacity-50"
              >
                {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Resend Code
              </button>
            </form>
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