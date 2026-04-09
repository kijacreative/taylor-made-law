import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '@/api/supabaseClient';
import { createAuditLog } from '@/services/admin';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import PublicNav from '@/components/layout/PublicNav';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const sb = getSupabase();
      if (sb) {
        // Use Supabase Auth password reset — sends a magic link email
        const { error: resetErr } = await sb.auth.resetPasswordForEmail(
          email.toLowerCase().trim(),
          { redirectTo: `${window.location.origin}/set-password` }
        );
        if (resetErr) throw resetErr;
      } else {
        throw new Error('Service unavailable');
      }

      // Audit log (fire-and-forget)
      createAuditLog({
        entity_type: 'User',
        entity_id: email,
        action: 'password_reset_requested',
        actor_email: email,
        notes: 'Password reset email sent via Supabase Auth',
      }).catch(() => {});

      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      // Still show success to prevent email enumeration
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                The link will expire in 1 hour. Check your spam folder if you don't see it.
              </p>
              <Link to="/login">
                <TMLButton variant="primary" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </TMLButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="flex items-center justify-center min-h-screen px-4 pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
              alt="Taylor Made Law"
              className="h-14 mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
            <p className="text-gray-500 mt-2">Enter your email and we'll send you a reset link.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d] transition-all"
                    placeholder="you@yourfirm.com"
                  />
                </div>
              </div>

              <TMLButton type="submit" variant="primary" className="w-full" loading={loading}>
                Send Reset Link
              </TMLButton>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <Link to="/login" className="text-sm text-[#3a164d] hover:underline font-medium flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
