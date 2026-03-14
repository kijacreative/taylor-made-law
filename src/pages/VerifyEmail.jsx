/**
 * VerifyEmail — TML-branded landing page for the activation link.
 *
 * The activation link from the TML approval email lands here:
 *   /VerifyEmail?email=...&token=...
 *
 * The ActivationToken (in the URL) is the ONLY security gate.
 * This page simply confirms the email address and directs the user to set their password.
 * No custom OTP codes are generated or verified here.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, ArrowRight } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';
  const token = urlParams.get('token') || '';

  // Missing token or email — invalid link
  if (!email || !token) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center py-24 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Activation Link</h2>
            <p className="text-gray-600 mb-6">
              This link is missing required information. Please use the activation link from your approval email, or contact support.
            </p>
            <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline text-sm font-medium">
              Contact Support
            </a>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const handleContinue = () => {
    navigate(`/SetPassword?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
  };

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
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center">
              <Mail className="w-8 h-8 text-[#3a164d]" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">Activate Your Account</h1>
            <p className="text-gray-600 mb-2">
              You're one step away from accessing the Taylor Made Law attorney portal.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Activating account for: <strong className="text-gray-700">{email}</strong>
            </p>

            <TMLButton
              variant="primary"
              className="w-full"
              onClick={handleContinue}
            >
              Continue to Set Password
              <ArrowRight className="w-4 h-4 ml-2" />
            </TMLButton>

            <p className="text-xs text-gray-400 mt-6">
              Wrong email?{' '}
              <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">
                Contact support
              </a>
            </p>
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