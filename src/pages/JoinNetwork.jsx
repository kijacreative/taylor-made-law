/**
 * ============================================================
 * CANONICAL ATTORNEY ONBOARDING FLOW
 * ============================================================
 * This is the ONE and ONLY lawyer signup page.
 * All CTAs, nav links, and invite email links must point here.
 * Backend: functions/applyToNetwork (the canonical backend function)
 *
 * DO NOT create additional lawyer signup pages or flows.
 * pages/ForLawyers redirects here for backward compatibility.
 * ============================================================
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Mail,
  Briefcase, DollarSign, Users, Shield, Plus, Trash2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';
import StepProgress from '@/components/attorney/StepProgress';

const STEPS = [
  { number: 1, label: 'Account Setup' },
  { number: 2, label: 'Practice Details' },
  { number: 3, label: 'Bio / Profile' },
  { number: 4, label: 'Agreements' },
];

const benefits = [
  { icon: Briefcase, title: 'Quality Case Referrals', description: 'Pre-screened cases matched to your practice areas and jurisdiction.' },
  { icon: DollarSign, title: 'Grow Your Practice', description: 'Expand your client base with verified leads ready for representation.' },
  { icon: Users, title: 'Network Access', description: 'Connect with other legal professionals and referral opportunities.' },
  { icon: Shield, title: 'Compliance Support', description: 'We handle referral compliance and documentation for you.' },
];

export default function JoinNetwork() {
  const navigate = useNavigate();

  // Pre-fill from invite email URL params (e.g. ?email=...&name=...)
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledEmail = urlParams.get('email') || '';
  const prefilledName = urlParams.get('name') || '';

  const [showForm, setShowForm] = useState(!!prefilledEmail);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [alreadyActivated, setAlreadyActivated] = useState(false);

  const [formData, setFormData] = useState({
    full_name: prefilledName,
    email: prefilledEmail,
    phone: '',
    firm_name: '',
    password: '',
    password_confirm: '',
    bar_number: '',
    states_licensed: [],
    practice_areas: [],
    bio: '',
    consent_terms: false,
    consent_referral: false,
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const toggleArrayItem = (field, item) => {
    const current = formData[field] || [];
    updateField(field, current.includes(item) ? current.filter(i => i !== item) : [...current, item]);
  };





  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!formData.full_name.trim()) e.full_name = 'Full name is required';
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Valid email is required';
      if (!formData.phone || formData.phone.replace(/\D/g, '').length < 10) e.phone = 'Valid phone number is required';
      if (!formData.firm_name.trim()) e.firm_name = 'Law firm name is required';
      if (!formData.password || formData.password.length < 8) e.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.password_confirm) e.password_confirm = 'Passwords do not match';
    }
    if (s === 2) {
      if (!formData.states_licensed.length) e.states_licensed = 'Select at least one state';
      if (!formData.practice_areas.length) e.practice_areas = 'Select at least one practice area';
      if (!formData.bar_number.trim()) e.bar_number = 'Bar number is required';
    }
    if (s === 3) {
      if (!formData.bio || formData.bio.length < 50) e.bio = 'Please provide a bio (at least 50 characters)';
    }
    if (s === 4) {
      if (!formData.consent_terms) e.consent_terms = 'You must accept the Terms & Privacy Policy';
      if (!formData.consent_referral) e.consent_referral = 'You must accept the Referral Agreement';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setLoading(true);
    setErrors({});
    try {
      // Create user with password + store profile + send emails
      const res = await base44.functions.invoke('completeOnboarding', {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        firm_name: formData.firm_name,
        bar_number: formData.bar_number,
        password: formData.password,
        states_licensed: formData.states_licensed,
        practice_areas: formData.practice_areas,
        bio: formData.bio,
        consent_terms: formData.consent_terms,
        consent_referral: formData.consent_referral,
      });

      if (res.data?.success) {
        setSubmittedEmail(formData.email.toLowerCase().trim());
        setSubmitted(true);
      } else {
        setErrors({ submit: res.data?.error || 'Submission failed. Please try again.' });
      }
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || err.message || 'An error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="pt-32 pb-24 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Application Received!</h1>
            <p className="text-xl text-gray-600 mb-4">
              Thank you, <strong>{formData.full_name}</strong>. We've received your application.
            </p>
            <p className="text-gray-600 mb-6">
              We sent a confirmation to <strong>{submittedEmail}</strong>. Our team will review your application within 2–3 business days.
            </p>
            <div className="bg-[#f5f0fa] rounded-xl p-6 mb-8 text-left">
              <p className="font-semibold text-[#3a164d] mb-3">What happens next:</p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#3a164d]" /> Admin reviews your application (2–3 business days)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#3a164d]" /> Upon approval you'll receive an account activation email</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#3a164d]" /> Set your password and get full access to the Case Exchange</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#3a164d]" /> Browse and accept case referrals</li>
              </ul>
            </div>
            <div className="flex gap-4 justify-center">
              <Link to={createPageUrl('Home')}>
                <TMLButton variant="primary">Return to Home</TMLButton>
              </Link>
              <a href="mailto:support@taylormadelaw.com">
                <TMLButton variant="secondary">Contact Support</TMLButton>
              </a>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Already activated screen ────────────────────────────────────
  if (alreadyActivated) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl text-center p-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Already Exists</h2>
              <p className="text-gray-600 mb-6">
                An account already exists for this email. Your application has been updated. Please log in to check your status.
              </p>
              <Link to={createPageUrl('LawyerLogin')}>
                <TMLButton variant="primary" className="w-full">Sign In →</TMLButton>
              </Link>
            </div>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Landing page ────────────────────────────────────────────────
  if (!showForm) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <section className="relative pt-24 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3a164d] to-[#7e277e]" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Join the Attorney Network</h1>
              <p className="text-xl text-white/80 max-w-2xl mx-auto mb-4">
                Get access to pre-screened, quality case referrals matched to your practice areas. Apply in minutes.
              </p>
              <p className="text-white/60 mb-10 text-sm">Applications are reviewed within 2–3 business days.</p>
              <TMLButton variant="accent" size="lg" onClick={() => setShowForm(true)}>
                Apply Now — It's Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </TMLButton>
              <p className="mt-4 text-white/50 text-sm">
                Already a member?{' '}
                <Link to={createPageUrl('LawyerLogin')} className="text-white/80 hover:text-white underline">Sign in</Link>
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Attorneys Choose Taylor Made Law</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((b, i) => (
                <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <TMLCard variant="elevated" className="h-full text-center p-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#3a164d] to-[#7e277e] flex items-center justify-center">
                      <b.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{b.title}</h3>
                    <p className="text-gray-600 text-sm">{b.description}</p>
                  </TMLCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#faf8f5]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Grow Your Practice?</h2>
            <p className="text-gray-600 mb-8">Apply in minutes. Our team reviews applications within 2–3 business days.</p>
            <TMLButton variant="primary" size="lg" onClick={() => setShowForm(true)}>
              Start Your Application
              <ArrowRight className="ml-2 w-5 h-5" />
            </TMLButton>
          </div>
        </section>

        <PublicFooter />
      </div>
    );
  }

  // ── Multi-step application form ─────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
              alt="Taylor Made Law"
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900">Attorney Network Application</h1>
            <p className="text-gray-500 mt-2">Complete all steps to submit your application for review</p>
          </div>

          <div className="mb-8">
            <StepProgress steps={STEPS} currentStep={step} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <TMLCard variant="elevated" className="p-8">

                {/* Step 1: Account Setup */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Create Your Account</h2>
                      <p className="text-gray-500 text-sm">Set up your login credentials and basic information.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <TMLInput label="Full Name" required value={formData.full_name} onChange={e => updateField('full_name', e.target.value)} placeholder="Jane Smith" error={errors.full_name} />
                      <TMLInput label="Email Address" type="email" required value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="jane@smithlaw.com" error={errors.email} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <TMLInput label="Phone Number" type="tel" required value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(555) 555-5555" error={errors.phone} />
                      <TMLInput label="Law Firm Name" required value={formData.firm_name} onChange={e => updateField('firm_name', e.target.value)} placeholder="Smith & Associates" error={errors.firm_name} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <TMLInput label="Password" type="password" required value={formData.password} onChange={e => updateField('password', e.target.value)} placeholder="Min 8 characters" error={errors.password} />
                      <TMLInput label="Confirm Password" type="password" required value={formData.password_confirm} onChange={e => updateField('password_confirm', e.target.value)} placeholder="Confirm password" error={errors.password_confirm} />
                    </div>
                  </div>
                )}

                {/* Step 2: Practice Details */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Practice Details</h2>
                      <p className="text-gray-500 text-sm">Tell us about your legal practice and licensing.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">States Where Licensed <span className="text-red-500">*</span></label>
                      {errors.states_licensed && <p className="text-red-600 text-xs mb-2">{errors.states_licensed}</p>}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                        {US_STATES.map(state => (
                          <button key={state} type="button" onClick={() => toggleArrayItem('states_licensed', state)}
                            className={`text-xs py-1.5 px-2 rounded-lg border transition-all ${formData.states_licensed.includes(state) ? 'bg-[#3a164d] text-white border-[#3a164d]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#3a164d]'}`}>
                            {state}
                          </button>
                        ))}
                      </div>
                      {formData.states_licensed.length > 0 && (
                        <p className="text-xs text-[#3a164d] mt-1">{formData.states_licensed.length} state{formData.states_licensed.length > 1 ? 's' : ''} selected</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Practice Areas <span className="text-red-500">*</span></label>
                      {errors.practice_areas && <p className="text-red-600 text-xs mb-2">{errors.practice_areas}</p>}
                      <div className="flex flex-wrap gap-2">
                        {PRACTICE_AREAS.map(area => (
                          <button key={area} type="button" onClick={() => toggleArrayItem('practice_areas', area)}
                            className={`text-sm py-1.5 px-3 rounded-full border transition-all ${formData.practice_areas.includes(area) ? 'bg-[#3a164d] text-white border-[#3a164d]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#3a164d]'}`}>
                            {area}
                          </button>
                        ))}
                      </div>
                    </div>
                    <TMLInput label="Bar Number" required value={formData.bar_number} onChange={e => updateField('bar_number', e.target.value)} placeholder="BAR123456" error={errors.bar_number} />
                  </div>
                )}

                {/* Step 3: Bio / Profile */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Professional Profile</h2>
                      <p className="text-gray-500 text-sm">Tell us about your legal background and experience.</p>
                    </div>
                    <TMLTextarea
                      label="Professional Bio"
                      required
                      value={formData.bio}
                      onChange={e => updateField('bio', e.target.value)}
                      placeholder="Tell us about your legal background, specialties, and what makes you a great fit for our network..."
                      rows={5}
                      error={errors.bio}
                      helperText={`${formData.bio.length} characters (min 50)`}
                    />
                  </div>
                )}

                {/* Step 4: Review & Agree */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Agree</h2>
                      <p className="text-gray-500 text-sm">Confirm your information and accept the agreements.</p>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
                      <p className="font-semibold text-gray-700">Application Summary</p>
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <span className="font-medium">Name:</span><span>{formData.full_name}</span>
                        <span className="font-medium">Email:</span><span>{formData.email}</span>
                        <span className="font-medium">Firm:</span><span>{formData.firm_name}</span>
                        <span className="font-medium">Bar #:</span><span>{formData.bar_number}</span>
                        <span className="font-medium">States:</span><span>{formData.states_licensed.join(', ')}</span>
                        <span className="font-medium">Practice Areas:</span><span>{formData.practice_areas.join(', ')}</span>
                        <span className="font-medium">Experience:</span><span>{formData.years_experience} years</span>
                      </div>
                    </div>

                    {/* Agreements */}
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={formData.consent_terms}
                          onCheckedChange={v => updateField('consent_terms', v)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-gray-700">
                          I accept the{' '}
                          <Link to={createPageUrl('TermsAndPrivacy')} target="_blank" className="text-[#3a164d] hover:underline">Terms & Conditions</Link>
                          {' '}and{' '}
                          <Link to={createPageUrl('TermsAndPrivacy')} target="_blank" className="text-[#3a164d] hover:underline">Privacy Policy</Link>
                        </span>
                      </label>
                      {errors.consent_terms && <p className="text-red-600 text-xs">{errors.consent_terms}</p>}

                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={formData.consent_referral}
                          onCheckedChange={v => updateField('consent_referral', v)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-gray-700">
                          I accept the{' '}
                          <Link to={createPageUrl('ReferralAgreement')} target="_blank" className="text-[#3a164d] hover:underline">Referral Agreement</Link>
                          {' '}with Taylor Made Law
                        </span>
                      </label>
                      {errors.consent_referral && <p className="text-red-600 text-xs">{errors.consent_referral}</p>}
                    </div>

                    {errors.submit && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-red-800">{errors.submit}</p>
                          {errors.submit?.includes('already exists') && (
                            <Link to={createPageUrl('LawyerLogin')} className="text-sm text-red-700 underline font-medium mt-1 block">Sign in here →</Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  {step > 1 ? (
                    <TMLButton variant="ghost" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </TMLButton>
                  ) : (
                    <TMLButton variant="ghost" onClick={() => setShowForm(false)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </TMLButton>
                  )}

                  {step < 4 && (
                    <TMLButton variant="primary" onClick={nextStep}>
                      Continue <ArrowRight className="w-4 h-4 ml-1" />
                    </TMLButton>
                  )}
                  {step === 4 && (
                    <TMLButton variant="primary" loading={loading} onClick={handleSubmit}>
                      Submit Application
                    </TMLButton>
                  )}
                </div>
              </TMLCard>

              {step === 1 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Already a member?{' '}
                  <Link to={createPageUrl('LawyerLogin')} className="text-[#3a164d] font-semibold hover:underline">Sign in</Link>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}