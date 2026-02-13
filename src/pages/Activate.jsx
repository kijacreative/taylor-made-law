import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';

export default function Activate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
    acceptedPrivacy: false
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid activation link');
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.acceptedTerms || !formData.acceptedPrivacy) {
      setError('Please accept the Terms & Conditions and Privacy Policy');
      return;
    }

    setActivating(true);

    try {
      const response = await base44.functions.invoke('activateAttorney', {
        token,
        password: formData.password,
        accepted_terms: formData.acceptedTerms
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(createPageUrl('Login'));
        }, 2000);
      } else {
        setError(response.data.error || 'Activation failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to activate account. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="flex items-center justify-center py-20 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <TMLCard variant="elevated" className="text-center">
              <TMLCardContent className="p-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Activated!</h2>
                <p className="text-gray-600 mb-4">
                  Your account has been successfully activated. Redirecting you to login...
                </p>
                <Loader2 className="w-6 h-6 animate-spin text-[#3a164d] mx-auto" />
              </TMLCardContent>
            </TMLCard>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      
      <div className="flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Activate Your Account</h1>
            <p className="text-gray-600">Set your password to complete activation</p>
          </div>

          <TMLCard variant="elevated">
            <TMLCardHeader>
              <TMLCardTitle>Create Your Password</TMLCardTitle>
            </TMLCardHeader>
            <TMLCardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <TMLInput
                  label="Password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password (min 8 characters)"
                  helperText="Must be at least 8 characters"
                />

                <TMLInput
                  label="Confirm Password"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                />

                <div className="space-y-3 pt-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.acceptedTerms}
                      onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                      className="mt-1 w-4 h-4 text-[#3a164d] rounded focus:ring-[#3a164d]"
                      required
                    />
                    <span className="text-sm text-gray-700">
                      I accept the{' '}
                      <a href="https://taylormadelaw.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">
                        Terms & Conditions
                      </a>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.acceptedPrivacy}
                      onChange={(e) => setFormData({ ...formData, acceptedPrivacy: e.target.checked })}
                      className="mt-1 w-4 h-4 text-[#3a164d] rounded focus:ring-[#3a164d]"
                      required
                    />
                    <span className="text-sm text-gray-700">
                      I accept the{' '}
                      <a href="https://taylormadelaw.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                </div>

                <TMLButton
                  type="submit"
                  variant="primary"
                  className="w-full mt-6"
                  loading={activating}
                >
                  Activate Account
                </TMLButton>
              </form>
            </TMLCardContent>
          </TMLCard>

          <p className="text-center text-sm text-gray-600 mt-6">
            Need help?{' '}
            <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">
              Contact Support
            </a>
          </p>
        </motion.div>
      </div>

      <PublicFooter />
    </div>
  );
}