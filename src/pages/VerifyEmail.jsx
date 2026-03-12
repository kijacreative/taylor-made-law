import React, { useState, useEffect } from 'react';
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
  const email = urlParams.get('email') || '';
  const token = urlParams.get('token') || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Only auto-send OTP if we have both email AND token (came from a valid approval link)
    // If no token, this page was reached incorrectly
    if (email && token) sendOtp();
  }, []);

  const sendOtp = async () => {
    setSending(true);
    setError('');
    try {
      await base44.functions.invoke('sendEmailOtp', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.');
    } finally {
      setSending(false);
    }
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
      const res = await base44.functions.invoke('verifyEmailOtp', { email, code });
      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/SetPassword?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
        }, 1500);
      } else {
        setError(res.data?.error || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-4">Redirecting you to create your password...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Verify Your Email</h1>
            <p className="text-gray-500 mt-2">Confirm your identity before creating your password</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {sending ? (
              <div className="text-center py-6">
                <Loader2 className="w-8 h-8 animate-spin text-[#3a164d] mx-auto mb-3" />
                <p className="text-gray-600">Sending verification code to <strong>{email}</strong>...</p>
              </div>
            ) : (
              <>
                {sent && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Verification code sent!</p>
                      <p className="text-sm text-blue-700">
                        We sent a 6-digit code to <strong>{email}</strong>. Check your inbox and spam folder.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-5">
                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <TMLInput
                    label="Email Address"
                    type="email"
                    value={email}
                    disabled
                  />

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
                    helperText="Enter the 6-digit code from your Taylor Made Law email"
                  />

                  <TMLButton type="submit" variant="primary" className="w-full" loading={loading}>
                    Verify Email
                  </TMLButton>

                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={sending}
                    className="w-full text-sm text-[#3a164d] hover:underline flex items-center justify-center gap-1.5 py-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend Code
                  </button>
                </form>
              </>
            )}
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