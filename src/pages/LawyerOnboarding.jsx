/**
 * LawyerOnboarding — Required post-login onboarding for new self-signup lawyers.
 * Route: /LawyerOnboarding
 *
 * 3 steps: Professional Profile → Referral Agreement → Billing Demo
 * On completion, sets profile_completed_at and redirects to dashboard.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft,
  FileText, CreditCard, User, Upload, X
} from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import { Checkbox } from '@/components/ui/checkbox';

const STEPS = [
  { number: 1, label: 'Professional Profile', icon: User },
  { number: 2, label: 'Referral Agreement', icon: FileText },
  { number: 3, label: 'Billing Setup', icon: CreditCard },
];

export default function LawyerOnboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({ bio: '', website: '', office_address: '' });
  const [headshotUrl, setHeadshotUrl] = useState('');
  const [headshotUploading, setHeadshotUploading] = useState(false);
  const [referralAccepted, setReferralAccepted] = useState(false);
  const [billing, setBilling] = useState({
    account_holder: '',
    bank_name: '',
    account_type: 'checking',
    last4: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate('/login'); return; }
        const userData = await base44.auth.me();
        if (userData.user_status === 'disabled') {
          await base44.auth.logout();
          navigate('/login');
          return;
        }
        if (userData.role === 'admin') {
          navigate('/AdminDashboard');
          return;
        }
        if (userData.profile_completed_at) {
          navigate('/app/dashboard');
          return;
        }
        // Pre-fill bio from LawyerProfile (which stores bio from signup application)
        let prefillBio = userData.bio || '';
        try {
          const profiles = await base44.entities.LawyerProfile.filter({ user_id: userData.id });
          if (profiles && profiles.length > 0 && profiles[0].bio) {
            prefillBio = profiles[0].bio;
          }
        } catch {}
        setProfile({
          bio: prefillBio,
          website: userData.website || '',
          office_address: userData.office_address || '',
        });
        setHeadshotUrl(userData.profile_photo_url || '');
        setUser(userData);
      } catch (e) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleComplete = async () => {
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();

      // Update User entity with all onboarding data + mark complete
      await base44.auth.updateMe({
        bio: profile.bio,
        website: profile.website,
        office_address: profile.office_address,
        profile_photo_url: headshotUrl || undefined,
        referral_agreement_accepted: true,
        referral_agreement_accepted_at: now,
        billing_demo_plan: 'trial_6mo_then_49',
        billing_demo_bank_name: billing.bank_name,
        billing_demo_account_holder: billing.account_holder,
        billing_demo_account_type: billing.account_type,
        billing_demo_last4: billing.last4,
        billing_demo_status: 'collected',
        billing_demo_collected_at: now,
        profile_completed_at: now,
      });

      // Upsert LawyerProfile with referral agreement and base data
      const profiles = await base44.entities.LawyerProfile.filter({ user_id: user.id }).catch(() => []);
      const profileData = {
        user_id: user.id,
        firm_name: user.firm_name || '',
        phone: user.phone || '',
        bar_number: user.bar_number || '',
        profile_photo_url: headshotUrl || undefined,
        bio: profile.bio || '',
        states_licensed: user.states_licensed || [],
        practice_areas: user.practice_areas || [],
        years_experience: user.years_experience || 0,
        status: 'approved',
        referral_agreement_accepted: true,
        referral_agreement_accepted_at: now,
      };
      if (profiles.length > 0) {
        await base44.entities.LawyerProfile.update(profiles[0].id, profileData).catch(() => {});
      } else {
        await base44.entities.LawyerProfile.create(profileData).catch(() => {});
      }

      // Audit log
      await base44.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: user.id,
        action: 'lawyer_onboarding_completed',
        actor_email: user.email,
        actor_role: 'user',
        notes: 'Onboarding completed: profile, referral agreement, billing demo',
      }).catch(() => {});

      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canProceedStep1 = profile.bio.trim().length >= 20;
  const canProceedStep2 = referralAccepted;
  const canProceedStep3 = billing.account_holder.trim() && billing.bank_name.trim() && billing.last4.length === 4;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <img
          src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
          alt="Taylor Made Law"
          className="h-8"
        />
        <button
          onClick={() => base44.auth.logout()}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Attorney Profile</h1>
          <p className="text-gray-600 mt-2 max-w-lg mx-auto">Welcome to the Taylor Made Law Attorney Network. Before accessing the full platform, please complete the following steps to finish setting up your account.</p>
          <p className="text-gray-500 text-sm mt-2">This helps ensure accurate referrals and a trusted attorney network.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.number}>
              <div className={`flex items-center gap-2 ${step === s.number ? 'text-[#3a164d]' : step > s.number ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                  ${step > s.number ? 'bg-emerald-500 border-emerald-500 text-white' :
                    step === s.number ? 'bg-[#3a164d] border-[#3a164d] text-white' :
                    'bg-white border-gray-300 text-gray-400'}`}>
                  {step > s.number ? '✓' : s.number}
                </div>
                <span className="text-sm font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-10 h-px bg-gray-200 mx-1" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-white rounded-2xl shadow-lg p-8">

              {/* Step 1: Professional Profile */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Professional Profile</h2>
                    <p className="text-gray-500 text-sm">Tell other attorneys about your experience. This will appear on your network profile.</p>
                  </div>

                  {/* Headshot upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo (optional)</label>
                    <div className="flex items-center gap-4">
                      {headshotUrl ? (
                        <div className="relative">
                          <img src={headshotUrl} alt="Headshot" className="w-20 h-20 rounded-full object-cover border-2 border-[#3a164d]/20" />
                          <button type="button" onClick={() => setHeadshotUrl('')}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setHeadshotUploading(true);
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file });
                              setHeadshotUrl(file_url);
                            } catch {
                              // silently fail — headshot is optional
                            } finally {
                              setHeadshotUploading(false);
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#3a164d] hover:text-[#3a164d] transition-colors">
                          {headshotUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {headshotUploading ? 'Uploading...' : headshotUrl ? 'Change Photo' : 'Upload Photo'}
                        </div>
                      </label>
                    </div>
                  </div>

                  <TMLTextarea
                    label="Professional Bio"
                    required
                    value={profile.bio}
                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Describe your legal expertise, background, and areas of specialization (min 20 characters)..."
                    rows={5}
                    helperText={`${profile.bio.length} characters — minimum 20 required`}
                  />
                  <TMLInput
                    label="Website (optional)"
                    type="url"
                    value={profile.website}
                    onChange={e => setProfile({ ...profile, website: e.target.value })}
                    placeholder="https://yourfirm.com"
                  />
                  <TMLInput
                    label="Office Address (optional)"
                    value={profile.office_address}
                    onChange={e => setProfile({ ...profile, office_address: e.target.value })}
                    placeholder="123 Main St, Suite 100, New York, NY 10001"
                  />
                </div>
              )}

              {/* Step 2: Referral Agreement */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Referral Agreement</h2>
                    <p className="text-gray-500 text-sm">To participate in the Taylor Made Law referral network, attorneys must agree to the network referral terms.</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-h-64 overflow-y-auto text-sm text-gray-700 space-y-3 leading-relaxed">
                    <p className="font-semibold text-gray-900">Taylor Made Law Network — Referral Agreement</p>
                    <p>By joining the Taylor Made Law Network, you agree to the following referral terms and conditions:</p>
                    <p><strong>1. Referral Fees.</strong> Attorney agrees to pay Taylor Made Law a referral fee as outlined in the network fee schedule for each case referred and accepted through the platform.</p>
                    <p><strong>2. Case Handling.</strong> Attorney agrees to handle all referred cases in accordance with applicable state bar rules and professional conduct standards.</p>
                    <p><strong>3. Communication.</strong> Attorney agrees to provide timely updates on referred cases and to communicate professionally with all parties.</p>
                    <p><strong>4. Compliance.</strong> Attorney confirms they are in good standing with their state bar and will maintain that status throughout their network membership.</p>
                    <p><strong>5. Confidentiality.</strong> Attorney agrees to maintain strict confidentiality of all client information and case details shared through the platform.</p>
                    <p><strong>6. Platform Use.</strong> Attorney agrees to use the Taylor Made Law platform only for legitimate legal referral purposes and in accordance with the platform's terms of service.</p>
                    <p className="text-xs text-gray-400 pt-1">For the complete referral agreement, contact <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">support@taylormadelaw.com</a></p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer p-4 bg-[#f5f0fa] rounded-xl border border-[#3a164d]/20 hover:border-[#3a164d]/40 transition-colors">
                    <Checkbox
                      checked={referralAccepted}
                      onCheckedChange={v => setReferralAccepted(!!v)}
                      className="mt-0.5"
                    />
                    <span className="text-sm font-semibold text-[#3a164d] leading-relaxed">
                      I agree to the Taylor Made Law Referral Agreement and confirm that I am currently in good standing with my state bar.
                    </span>
                  </label>
                </div>
              )}

              {/* Step 3: Billing Demo */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Setup</h2>
                    <p className="text-gray-500 text-sm">Set up your membership plan to complete your account.</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-emerald-900 mb-1">Plan: 6-Month Free Trial → $49/month</p>
                    <p className="text-sm text-emerald-700 mb-2">Your membership includes:</p>
                    <ul className="text-sm text-emerald-700 space-y-0.5 list-disc list-inside">
                      <li>Access to the case marketplace</li>
                      <li>Participation in attorney circles</li>
                      <li>Community discussions</li>
                      <li>Educational resources</li>
                      <li>Network referrals</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Demo Notice</p>
                    <p>Billing setup is currently in demonstration mode. Stripe integration will be activated soon. <strong>No charges will be applied at this time.</strong></p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <TMLInput
                      label="Account Holder Name"
                      required
                      value={billing.account_holder}
                      onChange={e => setBilling({ ...billing, account_holder: e.target.value })}
                      placeholder="Jane Smith"
                    />
                    <TMLInput
                      label="Bank Name"
                      required
                      value={billing.bank_name}
                      onChange={e => setBilling({ ...billing, bank_name: e.target.value })}
                      placeholder="Chase Bank"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Type <span className="text-red-500">*</span></label>
                      <select
                        value={billing.account_type}
                        onChange={e => setBilling({ ...billing, account_type: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d] text-sm transition-all"
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>
                    <TMLInput
                      label="Last 4 Digits"
                      required
                      maxLength={4}
                      value={billing.last4}
                      onChange={e => setBilling({ ...billing, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="1234"
                      helperText="Last 4 digits of your account number"
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                {step > 1 ? (
                  <TMLButton variant="ghost" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </TMLButton>
                ) : <div />}

                {step < 3 && (
                  <TMLButton
                    variant="primary"
                    onClick={() => setStep(step + 1)}
                    disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-1" />
                  </TMLButton>
                )}
                {step === 3 && (
                  <TMLButton
                    variant="primary"
                    loading={saving}
                    onClick={handleComplete}
                    disabled={!canProceedStep3}
                  >
                    Save Billing Details <CheckCircle2 className="w-4 h-4 ml-1" />
                  </TMLButton>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-sm text-gray-500 mt-6">
          Need help?{' '}
          <a href="mailto:support@taylormadelaw.com" className="text-[#3a164d] hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}