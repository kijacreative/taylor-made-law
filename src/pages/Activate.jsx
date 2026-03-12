import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Mail } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';
import { Checkbox } from '@/components/ui/checkbox';

export default function Activate() {
  const navigate = useNavigate();
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [error, setError] = useState('');
  const [expiredError, setExpiredError] = useState(false);
  const [expiredEmail, setExpiredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [useForgotPassword, setUseForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const emailParam = urlParams.get('email') || '';

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-10">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Activation Link</h2>
              <p className="text-gray-600 mb-6">This link is missing required information. Please use the link from your email.</p>
              <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline text-sm">Contact Support</a>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const handleResendActivation = async () => {
    setResending(true);
    try {
      await base44.functions.invoke('resendActivation', { email: expiredEmail });
      setResendSuccess(true);
    } catch (err) {
      setError('Failed to resend. Please contact support@taylormadelaw.com');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must include at least one number');
      return;
    }
    if (!/[a-zA-Z]/.test(formData.password)) {
      setError('Password must include at least one letter');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.acceptTerms) {
      setError('You must accept the Terms & Conditions');
      return;
    }
    if (!formData.acceptPrivacy) {
      setError('You must accept the Privacy Policy');
      return;
    }

    setActivating(true);
    try {
      const response = await base44.functions.invoke('activateAccount', {
        token,
        password: formData.password,
      });

      if (response.data?.success) {
        // Try auto-login immediately
        try {
          await base44.auth.loginViaEmailPassword(response.data.email, formData.password);
          navigate(createPageUrl('LawyerDashboard'), { replace: true });
        } catch (loginErr) {
          const loginMsg = (loginErr?.response?.data?.message || loginErr?.message || '').toLowerCase();
          if (loginMsg.includes('verify') || loginMsg.includes('verification') || loginMsg.includes('confirm') || loginMsg.includes('not confirmed')) {
            // Base44 sent a verification email — show TML-branded screen telling user to check email
            setVerifiedEmail(response.data.email || emailParam || '');
            setNeedsVerification(true);
          } else {
            // Unknown login error — send to login page with success banner
            setSuccess(true);
            setTimeout(() => navigate(createPageUrl('LawyerLogin') + '?activated=1', { replace: true }), 2000);
          }
        }
        return;
      } else if (response.data?.expired) {
        setExpiredError(true);
        setExpiredEmail(response.data?.user_email || '');
        setError('');
      } else {
        setError(response.data?.error || 'Activation failed. Please try again or contact support.');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.expired) {
        setExpiredError(true);
        setExpiredEmail(data?.user_email || '');
      } else if (data?.use_forgot_password) {
        setUseForgotPassword(true);
      } else {
        setError(data?.error || err.message || 'Failed to activate. Please try again.');
      }
    } finally {
      setActivating(false);
    }
  };

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl text-center p-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#3a164d]/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#3a164d]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">One More Step — Check Your Email</h2>
              <p className="text-gray-600 mb-2">
                Your account is set up! We need to confirm your email address before you can log in.
              </p>
              <p className="text-gray-600 mb-6">
                We sent a verification link to{' '}
                <strong>{verifiedEmail || 'your email'}</strong>.
                {' '}Click the link in that email to complete sign-in.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 text-left mb-6">
                <strong>Tip:</strong> Check your spam or junk folder if you don't see it within a few minutes. The subject line will say "Confirm your email".
              </div>
              <p className="text-sm text-gray-500">
                Still having trouble?{' '}
                <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline font-medium">Contact Support</a>
              </p>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (resetEmailSent) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl text-center p-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-4">
                Your email has been verified! We've sent a password setup link to your address. Click that link to set your password and log in.
              </p>
              <p className="text-sm text-gray-500">
                Can't find it? Check your spam folder or{' '}
                <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">contact support</a>.
              </p>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (useForgotPassword) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl text-center p-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Already Set Up</h2>
              <p className="text-gray-600 mb-4">
                An account for this email was already created via another method. Please use <strong>Forgot Password</strong> on the login page to set or reset your password.
              </p>
              <a
                href={createPageUrl('ForgotPassword')}
                className="inline-block bg-[#3a164d] text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-[#2a1038] transition-colors"
              >
                Go to Forgot Password →
              </a>
              <p className="text-sm text-gray-500 mt-4">
                Need help?{' '}
                <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">Contact support</a>
              </p>
            </div>
          </motion.div>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Activated!</h2>
              <p className="text-gray-600 mb-4">Your account is ready. Redirecting you to login...</p>
              <Loader2 className="w-6 h-6 animate-spin text-[#3a164d] mx-auto" />
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (expiredError) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h2>
              <p className="text-gray-600 mb-6">
                This activation link has expired. Request a new one and we'll send it to{' '}
                {expiredEmail ? <strong>{expiredEmail}</strong> : 'your email'}.
              </p>
              {resendSuccess ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Activation email sent! Check your inbox.
                </div>
              ) : (
                <TMLButton variant="primary" loading={resending} onClick={handleResendActivation} className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Activation Email
                </TMLButton>
              )}
              <p className="text-sm text-gray-500 mt-4">
                Need help? <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">Contact Support</a>
              </p>
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
      <div className="flex items-center justify-center py-16 px-4 pt-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
              alt="Taylor Made Law"
              className="h-14 mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900">Activate Your Account</h1>
            <p className="text-gray-500 mt-2">Verify your email and create a password to get started</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="relative">
                <TMLInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 chars, include letters & numbers"
                  helperText="Create a secure password (8+ characters with a mix of letters, numbers, and symbols)"
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
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={formData.acceptTerms}
                    onCheckedChange={v => setFormData({ ...formData, acceptTerms: v })}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-700">
                    I accept the{' '}
                    <a href="https://taylormadelaw.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Terms & Conditions</a>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={formData.acceptPrivacy}
                    onCheckedChange={v => setFormData({ ...formData, acceptPrivacy: v })}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-700">
                    I accept the{' '}
                    <a href="https://taylormadelaw.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Privacy Policy</a>
                  </span>
                </label>
              </div>

              <TMLButton type="submit" variant="primary" className="w-full mt-2" loading={activating}>
                Activate My Account
              </TMLButton>
            </form>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            Need help?{' '}
            <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">Contact Support</a>
          </p>
        </motion.div>
      </div>
      <PublicFooter />
    </div>
  );
}