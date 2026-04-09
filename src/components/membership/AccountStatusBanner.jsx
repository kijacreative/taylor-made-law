/**
 * AccountStatusBanner — shows contextual banner based on lawyer account state.
 *
 * States:
 * 1. Not Activated (email not verified / password not set) → verify email + upgrade CTA
 * 2. Active, Not Paid (no trial, no subscription) → upgrade CTA with trial option
 * 3. Active, Trial → days remaining + upgrade link
 * 4. Active, Paid → no banner (unless payment past due)
 * 5. Pending Approval → approval pending notice
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertCircle, Clock, CreditCard, Mail, ShieldAlert } from 'lucide-react';

function getDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return 0;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export default function AccountStatusBanner({ user, lawyerProfile }) {
  if (!user) return null;

  const status = user.user_status;
  const membership = user.membership_status || lawyerProfile?.subscription_status;
  const subscriptionStatus = lawyerProfile?.subscription_status || user.subscription_status;
  const passwordSet = user.password_set;
  const emailVerified = user.email_verified;
  const isPending = ['pending', 'active_pending_review', 'invited'].includes(status);
  const isApproved = status === 'approved' || lawyerProfile?.status === 'approved';
  const isTrial = membership === 'trial' || subscriptionStatus === 'trial';
  const isPaid = membership === 'paid' || subscriptionStatus === 'active';
  const isPastDue = subscriptionStatus === 'past_due';
  const isCancelled = subscriptionStatus === 'cancelled';
  const trialEndsAt = lawyerProfile?.trial_ends_at || user.trial_ends_at;

  // State 5: Pending approval
  if (isPending) {
    return null; // Handled by the dashboard's own pending banner
  }

  // State 4: Active + Paid + good standing → no banner
  if (isApproved && isPaid && !isPastDue && !isCancelled) {
    return null;
  }

  // State 4b: Active + Paid but payment issue
  if (isApproved && isPastDue) {
    return (
      <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-amber-900 text-sm">Payment Past Due</p>
          <p className="text-amber-700 text-sm mt-0.5">Your most recent payment didn't go through. Please update your payment method to keep your account active.</p>
        </div>
        <Link to={`${createPageUrl('LawyerSettings')}?tab=billing`} className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Update Payment
        </Link>
      </div>
    );
  }

  // State 4c: Cancelled
  if (isApproved && isCancelled) {
    return (
      <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-red-900 text-sm">Subscription Cancelled</p>
          <p className="text-red-700 text-sm mt-0.5">Your subscription has been cancelled. Resubscribe to regain full access to the platform.</p>
        </div>
        <Link to={`${createPageUrl('LawyerSettings')}?tab=billing`} className="shrink-0 px-4 py-2 bg-[#3a164d] hover:bg-[#2a1038] text-white text-sm font-semibold rounded-lg transition-colors">
          Resubscribe
        </Link>
      </div>
    );
  }

  // State 3: Active + Trial → show days remaining
  if (isApproved && isTrial) {
    const daysLeft = getDaysRemaining(trialEndsAt);
    return (
      <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-blue-900 text-sm">
            {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial` : 'Your free trial has ended'}
          </p>
          <p className="text-blue-700 text-sm mt-0.5">
            {daysLeft > 0
              ? 'Add your payment details now so your access continues uninterrupted when the trial ends.'
              : 'Subscribe to continue accessing the Case Exchange, Legal Circles, and Direct Messaging.'}
          </p>
        </div>
        <Link to={`${createPageUrl('LawyerSettings')}?tab=billing`} className="shrink-0 px-4 py-2 bg-[#3a164d] hover:bg-[#2a1038] text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          {daysLeft > 0 ? 'Add Payment' : 'Subscribe — $99/mo'}
        </Link>
      </div>
    );
  }

  // State 1: Not Activated (email not verified or password not set)
  if (!passwordSet || !emailVerified) {
    return (
      <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <Mail className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-amber-900 text-sm">Activate Your Account</p>
          <p className="text-amber-700 text-sm mt-0.5">
            Verify your email to activate your account. Once activated, you can start a free 3-month trial.
          </p>
        </div>
        <Link to={`/verify-email?email=${encodeURIComponent(user.email)}`} className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Verify Email
        </Link>
      </div>
    );
  }

  // State 2: Active, Not Paid (no trial, no subscription)
  if (isApproved && !isPaid && !isTrial) {
    return (
      <div className="mb-6 flex items-start gap-3 p-4 bg-gradient-to-r from-[#3a164d]/5 to-[#a47864]/5 border border-[#3a164d]/20 rounded-xl">
        <CreditCard className="w-5 h-5 text-[#3a164d] mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-[#3a164d] text-sm">Upgrade Your Membership</p>
          <p className="text-gray-600 text-sm mt-0.5">
            Subscribe for $99/month to accept cases, post referrals, and access all platform features. Or start with a free 3-month trial.
          </p>
        </div>
        <Link to={`${createPageUrl('LawyerSettings')}?tab=billing`} className="shrink-0 px-4 py-2 bg-[#3a164d] hover:bg-[#2a1038] text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Upgrade — $99/mo
        </Link>
      </div>
    );
  }

  return null;
}
