/**
 * VerifyEmail — Step 2 of lawyer activation.
 * URL: /VerifyEmail?email=...&password=...
 *
 * After the user sets their password (SetPassword page), Base44 sends a verification
 * code email. This page lets the user enter that Base44 code.
 * Uses base44.auth.verifyOtp(email, code) — the official Base44 SDK method.
 * On success, auto-logs the user in and redirects to the dashboard.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
  const email = urlParams.get('email') || '';
  const password = urlParams.get('password') || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentMsg, setResentMsg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!email) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600 mb-4">Please use the activation link from your approval email.</p>
            <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline text-sm">Contact Support</a>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Parse Base44Error into a human-readable string
  const parseBase44Error = (err) => {
    // err.data.detail is an array of FastAPI validation objects: { type, loc, msg, input }
    if (Array.isArray(err?.data?.detail) && err.data.detail.length > 0) {
      const msgs = err.data.detail.map(e => {
        const field = e.loc?.[e.loc.length - 1];
        if (field === 'email') return 'Your email is missing from the verification request. Please return to the approval email and try again.';
        if (field === 'otp_code') return 'Please enter your verification code.';
        return e.msg || 'Validation error.';
      });
      return msgs[0]; // Show first specific message
    }
    // Fallback chain — never use err.message when it's the raw array-coercion "[object Object]"
    const raw = err?.data?.error || err?.data?.message || '';
    if (raw) return raw;
    const msg = (typeof err?.message === 'string' && !err.message.includes('[object Object]')) ? err.message.toLowerCase() : '';
    if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong')) {
      return 'The verification code is invalid. Please try again.';
    }
    if (msg.includes('expired')) {
      return 'This verification code has expired. Please request a new one.';
    }
    return "We couldn't verify your code. Please try again.";
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Send { email, otp_code } — the backend requires both fields by these exact names
      console.log("VERIFY PAYLOAD:", { email, otp_code: code });
      await base44.auth.verifyOtp({ email, otp_code: code });

      // Finalize activation: mark user_status=approved, LawyerApplication=active
      await base44.functions.invoke('finalizeActivation', { email }).catch(() => {});

      // Now log in with the password (set in previous step)
      if (password) {
        try {
          await base44.auth.loginViaEmailPassword(email, password);
          setSuccess(true);
          setTimeout(() => navigate(createPageUrl('LawyerDashboard'), { replace: true }), 1500);
          return;
        } catch {
          // Login failed — still show success and redirect to login page
        }
      }

      setSuccess(true);
      setTimeout(() => navigate(createPageUrl('LawyerLogin') + '?activated=1', { replace: true }), 1500);

    } catch (err) {
      console.log("VERIFY ERROR (name):", err?.name, "| status:", err?.status);
      console.log("VERIFY ERROR data.detail:", JSON.stringify(err?.data?.detail));
      setError(parseBase44Error(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl text-center p-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Activated!</h2>
              <p className="text-gray-600 mb-4">Your account has been activated successfully. Redirecting you to sign in...</p>
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
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
              alt="Taylor Made Law"
              className="h-14 mx-auto mb-6"
            />
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">✓</div>
              <span className="text-sm text-gray-500">Set Password</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#3a164d] text-white text-xs font-bold flex items-center justify-center">2</div>
              <span className="text-sm font-medium text-[#3a164d]">Verify Email</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                <Mail className="w-7 h-7 text-[#3a164d]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
              <p className="text-gray-500 mt-2 text-sm">
                Enter the verification code sent to <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
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
                label="Verification Code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                autoFocus
                helperText="Check your email inbox (and spam folder) for the verification code"
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

          <p className="text-center text-sm text-gray-600 mt-6">
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