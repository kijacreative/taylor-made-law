import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

export default function LawyerLogin() {
  const navigate = useNavigate();

  // Step: 'login' | 'otp'
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // OTP state
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  const urlParams = new URLSearchParams(window.location.search);
  const activated = urlParams.get('activated') === '1';

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (auth) {
        const userData = await base44.auth.me();
        if (userData.role === 'admin') {
          await base44.auth.logout();
          setCheckingAuth(false);
          setError('This login is for attorneys only. Please use the admin portal.');
        } else {
          navigate(createPageUrl('LawyerDashboard'), { replace: true });
        }
      } else {
        setCheckingAuth(false);
      }
    });
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.login({ email: email.toLowerCase().trim(), password });
      // If login succeeds without OTP, check role and redirect
      const userData = await base44.auth.me();
      if (userData.role === 'admin') {
        await base44.auth.logout();
        setError('This login is for attorneys only. Admin users must use the admin portal.');
        return;
      }
      navigate(createPageUrl('LawyerDashboard'), { replace: true });
    } catch (err) {
      // Check if error indicates OTP is needed
      const msg = err.response?.data?.error || err.message || '';
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('verif') || msg.toLowerCase().includes('code')) {
        // OTP required — move to OTP step
        setStep('otp');
        setResendCooldown(60);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const code = otpCode.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email: email.toLowerCase().trim(), otpCode: code });
      const userData = await base44.auth.me();
      if (userData.role === 'admin') {
        await base44.auth.logout();
        setError('This login is for attorneys only. Admin users must use the admin portal.');
        setStep('login');
        return;
      }
      navigate(createPageUrl('LawyerDashboard'), { replace: true });
    } catch (err) {
      setError('Invalid or expired code. Please try again or request a new code.');
      setOtpCode(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    try {
      await base44.auth.resendOtp(email.toLowerCase().trim());
      setResendCooldown(60);
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
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
            <p className="text-gray-500 mt-2">
              {step === 'otp' ? 'Enter your verification code' : 'Sign in to access your dashboard'}
            </p>
          </div>

          {/* Activated success banner */}
          {activated && step === 'login' && (
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
            <AnimatePresence mode="wait">

              {/* ── LOGIN STEP ── */}
              {step === 'login' && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleLoginSubmit}
                  className="space-y-5"
                >
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
                </motion.form>
              )}

              {/* ── OTP STEP ── */}
              {step === 'otp' && (
                <motion.form
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleOtpSubmit}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => { setStep('login'); setError(''); setOtpCode(['', '', '', '', '', '']); }}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-500">Back to login</span>
                  </div>

                  {/* Info box */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <Mail className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Check your email</p>
                      <p className="text-sm text-blue-700">
                        We sent a 6-digit verification code to <strong>{email}</strong>
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  {/* OTP Input Boxes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Verification Code</label>
                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                      {otpCode.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => otpRefs.current[i] = el}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#3a164d] focus:ring-2 focus:ring-[#3a164d]/20 transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <TMLButton
                    type="submit"
                    variant="primary"
                    className="w-full"
                    loading={loading}
                  >
                    Verify & Sign In
                  </TMLButton>

                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Didn't receive a code?</p>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || resending}
                      className="text-sm text-[#3a164d] hover:underline font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </motion.form>
              )}

            </AnimatePresence>

            {step === 'login' && (
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
            )}
          </div>
        </motion.div>
      </div>
      <PublicFooter />
    </div>
  );
}