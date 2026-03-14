/**
 * SetPassword — Step 1 of lawyer activation.
 * URL: /SetPassword?email=...&token=...
 *
 * User sets their password here. On submit, calls registerActivation backend function
 * which validates the ActivationToken and creates the Base44 auth account.
 * Base44 automatically sends a verification code email.
 * On success, user is redirected to /VerifyEmail to enter the code.
 */
import React, { useState } from 'react';
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

export default function SetPassword() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  const email = urlParams.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiredError, setExpiredError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
  });

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-10">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Activation Link</h2>
              <p className="text-gray-600 mb-6">This link is missing required information. Please use the link from your approval email.</p>
              <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline text-sm">Contact Support</a>
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
                This activation link has expired. Please contact support to request a new activation email.
              </p>
              <a href="mailto:support@taylormadelaw.com" className="inline-block bg-[#3a164d] text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-[#2a1038] transition-colors">
                Contact Support
              </a>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

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

    setLoading(true);
    try {
      const response = await base44.functions.invoke('registerActivation', {
        token,
        email,
        password: formData.password,
      });

      if (response.data?.success) {
        // Registration succeeded — Base44 sent a verification code email.
        // Redirect to VerifyEmail page so user can enter the code.
        navigate(`/VerifyEmail?email=${encodeURIComponent(response.data.email || email)}&password=${encodeURIComponent(formData.password)}`);
      } else if (response.data?.expired) {
        setExpiredError(true);
      } else if (response.data?.already_used) {
        setError('This activation link has already been used. If you already set a password, please log in. Otherwise contact support.');
      } else {
        setError(response.data?.error || 'Activation failed. Please try again or contact support.');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.expired) {
        setExpiredError(true);
      } else {
        setError(data?.error || err.message || 'Failed to activate. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="flex items-center justify-center py-16 px-4 pt-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
              alt="Taylor Made Law"
              className="h-14 mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900">Create Your Password</h1>
            <p className="text-gray-500 mt-2">Set a secure password for your attorney portal</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#3a164d] text-white text-xs font-bold flex items-center justify-center">1</div>
              <span className="text-sm font-medium text-[#3a164d]">Set Password</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center">2</div>
              <span className="text-sm text-gray-400">Verify Email</span>
            </div>
          </div>

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
                value={email}
                disabled
              />

              <div className="relative">
                <TMLInput
                  label="Create Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 characters with letters & numbers"
                  helperText="At least 8 characters with a mix of letters and numbers"
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

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">After setting your password, we'll send a verification code to <strong>{email}</strong> to confirm your account.</p>
              </div>

              <TMLButton type="submit" variant="primary" className="w-full mt-2" loading={loading}>
                Set Password & Continue
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