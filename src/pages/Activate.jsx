import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';

export default function Activate() {
  const navigate = useNavigate();
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const emailParam = urlParams.get('email') || '';

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

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
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token || !emailParam) {
      setError('Invalid activation link. Please check your email for the correct link.');
      return;
    }

    setActivating(true);
    try {
      const response = await base44.functions.invoke('activateFromApplication', {
        token,
        email: emailParam,
        password: formData.password,
      });

      if (response.data?.success) {
        setSuccess(true);
        setTimeout(() => base44.auth.redirectToLogin(), 2500);
      } else {
        setError(response.data?.error || 'Activation failed. Please try again or contact support.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to activate. Please try again.';
      setError(msg);
    } finally {
      setActivating(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="flex items-center justify-center py-20 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
            <TMLCard variant="elevated" className="text-center p-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Set!</h2>
              <p className="text-gray-600 mb-4">Your account is ready. Redirecting you to login...</p>
              <Loader2 className="w-6 h-6 animate-spin text-[#3a164d] mx-auto" />
            </TMLCard>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!token || !emailParam) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="flex items-center justify-center py-20 px-4">
          <TMLCard variant="elevated" className="max-w-md w-full text-center p-10">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Activation Link</h2>
            <p className="text-gray-600 mb-6">This link is missing required information. Please use the link from your approval email.</p>
            <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline text-sm">Contact Support</a>
          </TMLCard>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <div className="flex items-center justify-center py-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Your Password</h1>
            <p className="text-gray-600">Create a password to activate your attorney account</p>
          </div>

          <TMLCard variant="elevated">
            <TMLCardHeader>
              <TMLCardTitle>Account Activation</TMLCardTitle>
              <p className="text-sm text-gray-500 mt-1">Activating for <strong>{emailParam}</strong></p>
            </TMLCardHeader>
            <TMLCardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Min 8 characters, include a number"
                    helperText="At least 8 characters with at least one number"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
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
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <TMLButton type="submit" variant="primary" className="w-full mt-2" loading={activating}>
                  Activate My Account
                </TMLButton>
              </form>
            </TMLCardContent>
          </TMLCard>

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