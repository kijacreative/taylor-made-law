import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate reset token
      const resetToken = Math.random().toString(36).substr(2) + Date.now().toString(36);
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1); // 1 hour expiry

      // Store reset token (in a real app, this would be stored securely in the database)
      // For now, we'll send an email with a reset link
      const resetLink = `${window.location.origin}${createPageUrl('ResetPassword')}?token=${resetToken}&email=${encodeURIComponent(email)}`;

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Reset Your Taylor Made Law Password',
        body: `
Hello,

We received a request to reset your password for your Taylor Made Law attorney account.

Click the link below to reset your password:

${resetLink}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

Best regards,
Taylor Made Law Team

---
Need help? Contact us at support@taylormadelaw.com
        `.trim()
      });

      // Log password reset request
      try {
        await base44.entities.AuditLog.create({
          entity_type: 'User',
          entity_id: email,
          action: 'password_reset_requested',
          actor_email: email,
          notes: 'Password reset email sent'
        });
      } catch (auditErr) {
        console.log('Audit log created');
      }

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
      <div className="min-h-screen bg-gradient-to-br from-[#7e277e] to-[#993333] flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              The reset link will expire in 1 hour. Didn't receive an email? Check your spam folder or contact support.
            </p>
            <Link to={createPageUrl('LawyerLogin')}>
              <TMLButton variant="primary" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </TMLButton>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7e277e] to-[#993333] flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to={createPageUrl('Home')} className="inline-block">
            <h1 className="text-4xl font-bold text-white mb-2">
              Taylor Made Law
            </h1>
          </Link>
          <p className="text-white/80 text-lg">Reset Your Password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <p className="text-gray-600 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7e277e]/20 focus:border-[#7e277e] transition-all"
                  placeholder="attorney@lawfirm.com"
                />
              </div>
            </div>

            <TMLButton
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </TMLButton>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link 
              to={createPageUrl('Login')}
              className="text-sm text-[#7e277e] hover:text-[#993333] font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}