import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle,
  Briefcase, DollarSign, Users, Shield, Star, Scale,
  Building2, Mail, MapPin, Eye, EyeOff, Plus, Trash2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import TMLSelect from '@/components/ui/TMLSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';
import StepProgress from '@/components/attorney/StepProgress';
import EmailVerifyStep from '@/components/attorney/EmailVerifyStep';

const LAWYER_CONSENT_VERSION = '1.0.0';
const REFERRAL_AGREEMENT_VERSION = '1.0.0';

export default function ForLawyers() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    firm_name: '',
    bar_number: '',
    years_experience: '',
    states_licensed: [],
    practice_areas: [],
    bio: '',
    referrals: [], // [{name, email}]
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

  const addReferral = () => {
    setFormData(prev => ({ ...prev, referrals: [...prev.referrals, { name: '', email: '' }] }));
  };

  const updateReferral = (index, field, value) => {
    const updated = formData.referrals.map((r, i) => i === index ? { ...r, [field]: value } : r);
    setFormData(prev => ({ ...prev, referrals: updated }));
  };

  const removeReferral = (index) => {
    setFormData(prev => ({ ...prev, referrals: prev.referrals.filter((_, i) => i !== index) }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!formData.full_name) e.full_name = 'Full name is required';
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Valid email is required';
      if (!formData.phone || formData.phone.length < 10) e.phone = 'Valid phone number is required';
      if (!formData.firm_name) e.firm_name = 'Firm name is required';
      if (!formData.bar_number) e.bar_number = 'Bar number is required';
      if (!formData.password || formData.password.length < 8) e.password = 'Password must be at least 8 characters';
      if (!/[0-9]/.test(formData.password) && formData.password) e.password = 'Include at least one number';
      if (formData.password !== formData.confirm_password) e.confirm_password = 'Passwords do not match';
    }
    if (s === 2) {
      if (!formData.states_licensed || formData.states_licensed.length === 0) e.states_licensed = 'Select at least one state';
      if (!formData.practice_areas || formData.practice_areas.length === 0) e.practice_areas = 'Select at least one practice area';
      if (!formData.years_experience) e.years_experience = 'Years of experience is required';
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
    try {
      // Register + login
      await base44.auth.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name
      });
      await base44.auth.loginViaEmailPassword(formData.email, formData.password);
      const user = await base44.auth.me();

      // Create lawyer profile (pending)
      const profile = await base44.entities.LawyerProfile.create({
        user_id: user.id,
        firm_name: formData.firm_name,
        bar_number: formData.bar_number,
        bio: formData.bio,
        phone: formData.phone,
        states_licensed: formData.states_licensed,
        practice_areas: formData.practice_areas,
        years_experience: parseInt(formData.years_experience) || 0,
        status: 'pending',
        subscription_status: 'none',
      });

      // Consent logs (parallel)
      await Promise.all([
        base44.entities.ConsentLog.create({
          entity_type: 'LawyerProfile',
          entity_id: profile.id,
          consent_type: 'lawyer_terms',
          consent_version: LAWYER_CONSENT_VERSION,
          consent_text: 'Terms of Service and Privacy Policy accepted.',
          consented_at: new Date().toISOString()
        }),
        base44.entities.ConsentLog.create({
          entity_type: 'LawyerProfile',
          entity_id: profile.id,
          consent_type: 'referral_agreement',
          consent_version: REFERRAL_AGREEMENT_VERSION,
          consent_text: 'Referral Agreement with Taylor Made Law accepted.',
          consented_at: new Date().toISOString()
        })
      ]);

      // Audit log
      await base44.entities.AuditLog.create({
        entity_type: 'LawyerProfile',
        entity_id: profile.id,
        action: 'lawyer_applied',
        actor_email: formData.email,
        actor_role: 'lawyer',
        notes: `New lawyer application: ${formData.full_name} — ${formData.firm_name}`
      });

      // Handle referral invitations
      const validReferrals = formData.referrals.filter(r => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
      for (const ref of validReferrals) {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await base44.entities.Invitation.create({
          inviter_email: formData.email,
          inviter_name: formData.full_name,
          invitee_email: ref.email,
          invitee_name: ref.name || '',
          message: 'I just applied to Taylor Made Law and thought you might be interested too.',
          token,
          status: 'pending',
          sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        try {
          await base44.functions.invoke('sendApplicationEmails', {
            to: ref.email,
            subject: `${formData.full_name} Invites You to Join Taylor Made Law`,
            body: `<p>Hello${ref.name ? ' ' + ref.name : ''},</p><p><strong>${formData.full_name}</strong> has invited you to join the Taylor Made Law attorney network.</p><p><a href="${window.location.origin}${createPageUrl('ForLawyers')}">Apply now →</a></p><p>Best regards,<br/>Taylor Made Law Team</p>`
          });
        } catch (e) { /* non-critical */ }
      }

      // Send confirmation email to lawyer
      try {
        await base44.functions.invoke('sendApplicationEmails', {
          to: formData.email,
          from_name: 'Taylor Made Law Network',
          subject: 'Application Received — Taylor Made Law Network',
          body: `
            <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #faf8f5;">
              <div style="text-align: center; margin-bottom: 28px;">
                <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 48px;" />
              </div>
              <div style="background: white; border-radius: 16px; padding: 36px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);">
                <div style="text-align: center; margin-bottom: 28px;">
                  <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 28px;">✓</div>
                  <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 8px;">Application Received!</h1>
                  <p style="color: #6b7280; margin: 0;">Thank you for applying, ${formData.full_name}.</p>
                </div>
                <div style="background: #f5f0fa; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                  <p style="color: #3a164d; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px;">Your Application Summary</p>
                  <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
                    <tr><td style="padding: 4px 0; color: #6b7280; width: 35%;">Firm</td><td style="font-weight: 600;">${formData.firm_name}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">States</td><td style="font-weight: 600;">${formData.states_licensed.join(', ')}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Practice Areas</td><td style="font-weight: 600;">${formData.practice_areas.join(', ')}</td></tr>
                  </table>
                </div>
                <p style="color: #374151; font-size: 14px; line-height: 1.7;">Our team will review your credentials and reach out within <strong>2–3 business days</strong>. In the meantime, you can explore your dashboard.</p>
                <a href="${window.location.origin}${createPageUrl('LawyerDashboard')}" style="display: block; background: #3a164d; color: white; text-align: center; padding: 14px; border-radius: 50px; font-weight: 700; margin-top: 24px; text-decoration: none;">Go to My Dashboard →</a>
              </div>
              <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 24px;">© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
            </div>
          `
        });
      } catch (e) { /* non-critical */ }

      // Alert admins
      try {
        await base44.functions.invoke('notifyAdminNewLawyer', {
          lawyerName: formData.full_name,
          lawyerEmail: formData.email,
          firmName: formData.firm_name,
          states: formData.states_licensed,
          practiceAreas: formData.practice_areas,
          profileId: profile.id
        });
      } catch (e) { /* non-critical */ }

      setSubmitted(true);
    } catch (error) {
      setErrors({ submit: error.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Briefcase, title: 'Quality Case Referrals', description: 'Receive pre-screened cases matched to your practice areas and jurisdiction.' },
    { icon: DollarSign, title: 'Grow Your Practice', description: 'Expand your client base with verified leads ready for representation.' },
    { icon: Users, title: 'Network Access', description: 'Connect with other legal professionals and referral opportunities.' },
    { icon: Shield, title: 'Compliance Support', description: 'We handle referral compliance and documentation for you.' },
  ];

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
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">You're In the Queue!</h1>
            <p className="text-xl text-gray-600 mb-8">
              Your email is verified and your application is now under review. We'll be in touch within 2–3 business days.
            </p>
            <TMLCard variant="cream" className="text-left mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
              <ul className="space-y-3">
                {[
                  'Our team verifies your bar membership and credentials',
                  'You\'ll receive an "Approved — Access Granted" email',
                  'Start receiving case referrals matched to your expertise',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#3a164d] mt-0.5 shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </TMLCard>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={createPageUrl('LawyerDashboard')}>
                <TMLButton variant="primary">Go to My Dashboard</TMLButton>
              </Link>
              <Link to={createPageUrl('Home')}>
                <TMLButton variant="outline">Return to Home</TMLButton>
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

        {/* Hero */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 bg-[#3a164d]/10 rounded-full px-4 py-2 text-[#3a164d] font-semibold text-sm mb-6">
                  <Star className="w-4 h-4" />
                  Join 500+ Attorneys in Our Network
                </div>
                <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  Get Fitted for a<br />
                  <span className="text-[#3a164d]">Better Legal Match.</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Taylor Made Law connects qualified attorneys with pre-screened clients. Join our network and receive quality case referrals matched to your expertise.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <TMLButton variant="primary" size="lg" onClick={() => setShowForm(true)}>
                    Apply Now — It's Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </TMLButton>
                  <a href="/login">
                    <TMLButton variant="outline" size="lg">Attorney Login</TMLButton>
                  </a>
                </div>
                <p className="text-sm text-gray-400 mt-4">* First 6 months free for qualified attorneys, subject to approval</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                <TMLCard variant="elevated" className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Scale className="w-6 h-6 text-[#3a164d]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Network Membership</h3>
                      <p className="text-gray-500 text-sm">$50/month after approval</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {['Pre-screened case referrals', 'Cases matched to your expertise', 'No per-lead fees', 'Dedicated support'].map(item => (
                      <div key={item} className="flex items-center gap-3 bg-[#faf8f5] rounded-lg px-4 py-3">
                        <CheckCircle2 className="w-5 h-5 text-[#3a164d]" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </TMLCard>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Attorneys Choose Taylor Made Law</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Join a network designed to help you grow your practice with quality clients.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((b, i) => (
                <motion.div key={b.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
                  <TMLCard variant="cream" hover className="h-full text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <b.icon className="w-7 h-7 text-[#3a164d]" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                    <p className="text-gray-600 text-sm">{b.description}</p>
                  </TMLCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-gradient-to-br from-[#3a164d] to-[#993333]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Grow Your Practice?</h2>
            <p className="text-xl text-white/80 mb-10">Join our network today and start receiving quality case referrals.</p>
            <TMLButton variant="accent" size="xl" onClick={() => setShowForm(true)}>
              Apply Now <ArrowRight className="ml-2 w-5 h-5" />
            </TMLButton>
            <p className="text-white/60 text-sm mt-6">* First 6 months free for qualified attorneys, subject to approval</p>
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
      <div className="pt-28 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Attorney Application</h1>
            <p className="text-gray-500">Complete the steps below to apply for network membership.</p>
          </div>

          <StepProgress currentStep={step} />

          <TMLCard variant="elevated" className="p-8">
            <AnimatePresence mode="wait">

              {/* ─ Step 1: Account Setup ─ */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Account Setup</h2>
                      <p className="text-gray-500 text-sm">Create your account credentials</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <TMLInput label="Full Name" placeholder="Jane Smith" value={formData.full_name} onChange={e => updateField('full_name', e.target.value)} error={errors.full_name} required />
                    <TMLInput label="Email Address" type="email" placeholder="jane@lawfirm.com" value={formData.email} onChange={e => updateField('email', e.target.value)} error={errors.email} required />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <TMLInput label="Phone Number" type="tel" placeholder="(555) 123-4567" value={formData.phone} onChange={e => updateField('phone', e.target.value)} error={errors.phone} required />
                    <TMLInput label="Law Firm Name" placeholder="Smith & Associates" value={formData.firm_name} onChange={e => updateField('firm_name', e.target.value)} error={errors.firm_name} required />
                  </div>
                  <TMLInput label="Bar Number" placeholder="Your bar registration number" value={formData.bar_number} onChange={e => updateField('bar_number', e.target.value)} error={errors.bar_number} required />

                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Create a secure password</p>
                    <p className="text-xs text-gray-400 mb-4">Use at least 8 characters with a mix of letters, numbers, and symbols.</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <TMLInput
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={formData.password}
                          onChange={e => updateField('password', e.target.value)}
                          error={errors.password}
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <TMLInput
                          label="Confirm Password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          value={formData.confirm_password}
                          onChange={e => updateField('confirm_password', e.target.value)}
                          error={errors.confirm_password}
                          required
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <TMLButton variant="primary" onClick={nextStep}>Continue <ArrowRight className="ml-2 w-4 h-4" /></TMLButton>
                  </div>
                </motion.div>
              )}

              {/* ─ Step 2: Email Verification ─ */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <EmailVerifyStep
                    email={formData.email}
                    onVerified={() => {
                      setEmailVerified(true);
                      setErrors({});
                      setStep(3);
                    }}
                  />
                  {errors.email_verify && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" /><span>{errors.email_verify}</span>
                    </div>
                  )}
                  <div className="flex justify-start pt-2">
                    <TMLButton variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 w-4 h-4" />Back</TMLButton>
                  </div>
                </motion.div>
              )}

              {/* ─ Step 3: Practice Details ─ */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Scale className="w-5 h-5 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Practice Details</h2>
                      <p className="text-gray-500 text-sm">Tell us about your expertise</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">States Where Licensed <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
                      {US_STATES.map(state => (
                        <label key={state} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors">
                          <Checkbox checked={formData.states_licensed.includes(state)} onCheckedChange={() => toggleArrayItem('states_licensed', state)} />
                          <span className="text-sm text-gray-700">{state}</span>
                        </label>
                      ))}
                    </div>
                    {errors.states_licensed && <p className="text-sm text-red-600 mt-1">{errors.states_licensed}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Practice Areas <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-xl p-4 bg-gray-50">
                      {PRACTICE_AREAS.map(area => (
                        <label key={area} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors">
                          <Checkbox checked={formData.practice_areas.includes(area)} onCheckedChange={() => toggleArrayItem('practice_areas', area)} />
                          <span className="text-sm text-gray-700">{area}</span>
                        </label>
                      ))}
                    </div>
                    {errors.practice_areas && <p className="text-sm text-red-600 mt-1">{errors.practice_areas}</p>}
                  </div>

                  <TMLSelect
                    label="Years of Experience"
                    placeholder="Select years of experience"
                    options={[
                      { value: '1', label: '1–3 years' },
                      { value: '5', label: '4–7 years' },
                      { value: '10', label: '8–15 years' },
                      { value: '20', label: '15+ years' },
                    ]}
                    value={formData.years_experience}
                    onChange={e => updateField('years_experience', e.target.value)}
                    error={errors.years_experience}
                    required
                  />

                  <div className="flex justify-between pt-2">
                    <TMLButton variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 w-4 h-4" />Back</TMLButton>
                    <TMLButton variant="primary" onClick={nextStep}>Continue <ArrowRight className="ml-2 w-4 h-4" /></TMLButton>
                  </div>
                </motion.div>
              )}

              {/* ─ Step 4: Bio & Referrals ─ */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Bio & Referrals</h2>
                      <p className="text-gray-500 text-sm">Tell us about yourself and invite colleagues</p>
                    </div>
                  </div>

                  <TMLTextarea
                    label="Professional Bio"
                    placeholder="Tell potential clients about your background, experience, and approach to practicing law..."
                    rows={5}
                    value={formData.bio}
                    onChange={e => updateField('bio', e.target.value)}
                    error={errors.bio}
                    required
                    helperText={`${formData.bio.length}/50 minimum characters`}
                  />

                  {/* Referrals */}
                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Invite Colleagues <span className="text-gray-400 font-normal">(Optional)</span></h3>
                        <p className="text-xs text-gray-400 mt-0.5">Know an attorney who should join? Add them below.</p>
                      </div>
                      <TMLButton variant="ghost" size="sm" onClick={addReferral}>
                        <Plus className="w-4 h-4 mr-1" />Add Attorney
                      </TMLButton>
                    </div>
                    <div className="space-y-3">
                      {formData.referrals.map((ref, i) => (
                        <div key={i} className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl relative">
                          <TMLInput
                            placeholder="Attorney Name"
                            value={ref.name}
                            onChange={e => updateReferral(i, 'name', e.target.value)}
                          />
                          <TMLInput
                            placeholder="Attorney Email"
                            type="email"
                            value={ref.email}
                            onChange={e => updateReferral(i, 'email', e.target.value)}
                          />
                          <button onClick={() => removeReferral(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors">
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      ))}
                      {formData.referrals.length === 0 && (
                        <button onClick={addReferral} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:border-[#3a164d]/30 hover:text-[#3a164d] transition-colors flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4" />Add an Attorney to Invite
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <TMLButton variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 w-4 h-4" />Back</TMLButton>
                    <TMLButton variant="primary" onClick={nextStep}>Continue <ArrowRight className="ml-2 w-4 h-4" /></TMLButton>
                  </div>
                </motion.div>
              )}

              {/* ─ Step 5: Agreements ─ */}
              {step === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Review & Agree</h2>
                      <p className="text-gray-500 text-sm">Please review and accept the following</p>
                    </div>
                  </div>

                  {/* T&C + Privacy */}
                  <div className={`border rounded-xl p-5 transition-colors ${formData.consent_terms ? 'border-[#3a164d]/30 bg-[#3a164d]/5' : 'border-gray-200 bg-gray-50'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={formData.consent_terms}
                        onCheckedChange={v => updateField('consent_terms', v)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Terms of Service & Privacy Policy</p>
                        <p className="text-sm text-gray-500 mt-1">
                          I certify the information provided is accurate and I agree to the{' '}
                          <a href="#" className="text-[#3a164d] underline">Terms of Service</a> and{' '}
                          <a href="#" className="text-[#3a164d] underline">Privacy Policy</a>.
                        </p>
                      </div>
                    </label>
                    {errors.consent_terms && <p className="text-sm text-red-600 mt-2 ml-7">{errors.consent_terms}</p>}
                  </div>

                  {/* Referral Agreement */}
                  <div className={`border rounded-xl p-5 transition-colors ${formData.consent_referral ? 'border-[#3a164d]/30 bg-[#3a164d]/5' : 'border-gray-200 bg-gray-50'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={formData.consent_referral}
                        onCheckedChange={v => updateField('consent_referral', v)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Referral Agreement with Taylor Made Law</p>
                        <p className="text-sm text-gray-500 mt-1">
                          I agree to the{' '}
                          <a href="#" className="text-[#3a164d] underline">Taylor Made Law Referral Agreement</a>,
                          including referral fee terms and compliance requirements. My payment method will be securely stored but{' '}
                          <strong>not charged until my membership is approved</strong>.
                        </p>
                      </div>
                    </label>
                    {errors.consent_referral && <p className="text-sm text-red-600 mt-2 ml-7">{errors.consent_referral}</p>}
                  </div>

                  {/* Summary */}
                  <div className="bg-[#faf8f5] rounded-xl p-4 text-sm text-gray-500 border border-gray-200">
                    <p className="font-semibold text-gray-700 mb-2">Your Application Summary</p>
                    <div className="space-y-1">
                      <p><span className="text-gray-400">Name:</span> {formData.full_name}</p>
                      <p><span className="text-gray-400">Firm:</span> {formData.firm_name}</p>
                      <p><span className="text-gray-400">Email:</span> {formData.email}</p>
                      <p><span className="text-gray-400">States:</span> {formData.states_licensed.join(', ') || '—'}</p>
                      <p><span className="text-gray-400">Practice Areas:</span> {formData.practice_areas.join(', ') || '—'}</p>
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
                      <AlertCircle className="w-5 h-5 shrink-0" /><span>{errors.submit}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <TMLButton variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 w-4 h-4" />Back</TMLButton>
                    <TMLButton variant="primary" onClick={handleSubmit} loading={loading}>
                      Submit Request <ArrowRight className="ml-2 w-4 h-4" />
                    </TMLButton>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </TMLCard>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}