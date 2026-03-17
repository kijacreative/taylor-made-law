import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const isNewSignup = urlParams.get('new') === '1';

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
      setError('Please enter your email address.');
      return;
    }
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code from your email.');
      return;
    }

    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email: email.trim(), otpCode: code.trim() });
      setSuccess(true);
      setTimeout(() => navigate('/login?activated=1', { replace: true }), 1500);
    } catch (err) {
      const msg = err?.data?.error || err?.data?.message || err?.message || '';
      const lower = msg.toLowerCase();
      if (lower.includes('expired')) {
        setError('This verification code has expired. Please request a new one.');
      } else if (lower.includes('invalid') || lower.includes('incorrect') || lower.includes('wrong')) {
        setError('Invalid verification code. Please check and try again.');
      } else {
        setError(msg || "We couldn't verify your code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    setResending(true);
    setError('');
    setResentMsg('');
    try {
      await base44.auth.resendOtp(email.trim());
      setResentMsg(`A new code has been sent to ${email.trim()}.`);
    } catch {
      setError('Failed to resend. Please contact support@taylormadelaw.com.');
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
              <p className="text-gray-600 mb-4">Redirecting you to sign in...</p>
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
                Enter the 6-digit code we sent to{' '}
                {email ? <strong className="text-gray-700">{email}</strong> : 'your email address'}.
              </p>
            </div>

            {isNewSignup && (
              <div className="mb-4 p-4 bg-[#f5f0fa] border border-[#3a164d]/20 rounded-xl text-sm text-[#3a164d]">
                <p className="font-semibold mb-1">Application Received ✓</p>
                <p className="text-[#3a164d]/80">Check your inbox (and spam folder) for the verification code.</p>
              </div>
            )}

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
                helperText="Check your inbox and spam folder if you don't see it."
              />

              <TMLButton type="submit" variant="primary" className="w-full" loading={loading}>
                Verify Email
              </TMLButton>

              <div className="text-center pt-1">
                <p className="text-sm text-gray-500 mb-1">Didn't receive a code?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm text-[#3a164d] hover:underline font-semibold flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50"
                >
                  {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Resend Code
                </button>
              </div>
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