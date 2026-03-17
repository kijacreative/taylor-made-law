/**
 * VerifyEmail — Post-signup confirmation page.
 * 
 * After publicLawyerSignup, Base44 sends a magic-link verification email.
 * This page tells the user to check their email and click the link.
 * It also handles the ?token= callback from that magic link.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, AlertCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';
  const isNewSignup = urlParams.get('new') === '1';

  const [resending, setResending] = useState(false);
  const [resentMsg, setResentMsg] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Handle magic-link token callback (Base44 redirects back with ?token=...)
  useEffect(() => {
    const token = urlParams.get('token');
    if (!token) return;

    setVerifying(true);
    base44.auth.verifyOtp(email, token)
      .then(() => {
        setVerified(true);
        setTimeout(() => navigate('/login?activated=1', { replace: true }), 1500);
      })
      .catch(() => {
        // Token-based verify failed — just show the normal "check email" page
        setVerifying(false);
      });
  }, []);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError('');
    setResentMsg('');
    try {
      await base44.auth.resendOtp(email);
      setResentMsg(`A new verification email has been sent to ${email}.`);
    } catch {
      setError('Failed to resend. Please contact support@taylormadelaw.com.');
    } finally {
      setResending(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#3a164d] mx-auto mb-4" />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (verified) {
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
              <p className="text-gray-600 mb-1">Your account is now active.</p>
              <p className="text-gray-400 text-sm mb-4">Redirecting you to sign in...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Check Your Email</h1>
              <p className="text-gray-500 mt-2 text-sm">
                {email
                  ? <>We sent a verification link to <strong className="text-gray-700">{email}</strong>.</>
                  : 'We sent a verification link to your email address.'}
              </p>
            </div>

            {isNewSignup && (
              <div className="mb-5 p-4 bg-[#f5f0fa] border border-[#3a164d]/20 rounded-xl text-sm text-[#3a164d]">
                <p className="font-semibold mb-1">Application Received ✓</p>
                <p className="text-[#3a164d]/80">Your application is under review. Click the link in the verification email to activate your account.</p>
              </div>
            )}

            <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">How to verify:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Open the email from Taylor Made Law</li>
                    <li>Click the <strong>"Verify Email"</strong> button or link</li>
                    <li>You'll be redirected back here automatically</li>
                  </ol>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {resentMsg && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-800">{resentMsg}</p>
              </div>
            )}

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-500">Didn't receive the email?</p>
              <p className="text-xs text-gray-400">Check your spam/junk folder first, then:</p>
              {email && (
                <TMLButton
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  loading={resending}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </TMLButton>
              )}
              <TMLButton
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="w-full text-gray-500"
              >
                Already verified? Sign in
              </TMLButton>
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