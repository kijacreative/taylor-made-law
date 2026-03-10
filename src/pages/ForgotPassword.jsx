import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Always show success regardless of outcome (prevent email enumeration)
      await base44.functions.invoke('sendPasswordReset', { email: email.toLowerCase().trim() });
    } catch (err) {
      // Silent — still show success
      console.error('sendPasswordReset:', err.message);
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
              <p className="text-gray-600 mb-2">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                The link expires in 1 hour. Can't find it? Check your spam folder or{' '}
                <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">contact support</a>.
              </p>
              <Link to={createPageUrl('LawyerLogin')}>
                <TMLButton variant="primary" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                </TMLButton>
              </Link>
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
            <h1 className="text-3xl font-bold text-gray-900">Forgot Password?</h1>
            <p className="text-gray-500 mt-2">Enter your email and we'll send you a reset link</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <TMLInput
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourfirm.com"
                  autoComplete="email"
                />
                <Mail className="absolute right-3 top-9 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <TMLButton type="submit" variant="primary" className="w-full" loading={loading}>
                Send Reset Link
              </TMLButton>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <Link
                to={createPageUrl('LawyerLogin')}
                className="text-sm text-[#3a164d] font-medium hover:underline flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
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