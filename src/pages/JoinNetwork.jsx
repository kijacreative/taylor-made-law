import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle,
  Briefcase, DollarSign, Users, Shield,
  Plus, Trash2
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
  { number: 3, label: 'Bio & Referrals' },
  { number: 4, label: 'Review & Submit' },
];

export default function JoinNetwork() {
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    firm_name: '',
    bar_number: '',
    years_experience: '',
    states_licensed: [],
    practice_areas: [],
    bio: '',
    referrals: [],
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
      if (!formData.full_name.trim()) e.full_name = 'Full name is required';
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Valid email is required';
      if (!formData.phone || formData.phone.replace(/\D/g, '').length < 10) e.phone = 'Valid phone number is required';
      if (!formData.firm_name.trim()) e.firm_name = 'Firm name is required';
      if (!formData.bar_number.trim()) e.bar_number = 'Bar number is required';
    }
    if (s === 2) {
      if (!formData.states_licensed.length) e.states_licensed = 'Select at least one state';
      if (!formData.practice_areas.length) e.practice_areas = 'Select at least one practice area';
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
      const res = await base44.functions.invoke('joinLawyerNetwork', {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        firm_name: formData.firm_name,
        bar_number: formData.bar_number,
        years_experience: Number(formData.years_experience) || 0,
        states_licensed: formData.states_licensed,
        practice_areas: formData.practice_areas,
        bio: formData.bio,
        referrals: formData.referrals.filter(r => r.email),
      });

      if (res.data?.success) {
        setSubmitted(true);
      } else {
        setErrors({ submit: res.data?.error || 'Submission failed. Please try again.' });
      }
    } catch (error) {
      setErrors({ submit: error.response?.data?.error || error.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Briefcase, title: 'Quality Case Referrals', description: 'Pre-screened cases matched to your practice areas and jurisdiction.' },
    { icon: DollarSign, title: 'Grow Your Practice', description: 'Expand your client base with verified leads ready for representation.' },
    { icon: Users, title: 'Network Access', description: 'Connect with other legal professionals and referral opportunities.' },
    { icon: Shield, title: 'Compliance Support', description: 'We handle referral compliance and documentation for you.' },
  ];

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
              A confirmation has been sent to <strong>{formData.email}</strong>. Our team will review your application and send you account setup instructions shortly.
            </p>
            <div className="bg-[#f5f0fa] rounded-xl p-6 mb-8 text-left">
              <p className="font-semibold text-[#3a164d] mb-3">What happens next:</p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#3a164d]" /> Our team reviews your application (usually within 1 business day)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#3a164d]" /> You'll receive an email invite to set up your account</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#3a164d]" /> Complete your profile and start browsing cases</li>
              </ul>
            </div>
            <div className="flex gap-4 justify-center">
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

  if (!showForm) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <section className="relative pt-24 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3a164d] to-[#7e277e]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Join Our Attorney Network</h1>
              <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
                Sign up in minutes and get immediate access to pre-screened, quality case referrals matched to your practice areas.
              </p>
              <TMLButton variant="accent" size="lg" onClick={() => setShowForm(true)}>
                Join Now — It's Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </TMLButton>
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
            <p className="text-gray-600 mb-8">Create your account and start accessing cases right away.</p>
            <TMLButton variant="primary" size="lg" onClick={() => setShowForm(true)}>
              Create Your Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </TMLButton>
          </div>
        </section>

        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Your Attorney Account</h1>
            <p className="text-gray-600 mt-2">Complete all steps to join the network</p>
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

                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Account Setup</h2>
                    <p className="text-gray-500 text-sm mb-4">Create your login credentials and tell us about your firm.</p>
                    <TMLInput label="Full Name" required value={formData.full_name} onChange={e => updateField('full_name', e.target.value)} placeholder="Jane Smith" error={errors.full_name} />
                    <TMLInput label="Email Address" type="email" required value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="jane@smithlaw.com" error={errors.email} />
                    <TMLInput label="Phone Number" type="tel" required value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(555) 555-5555" error={errors.phone} />
                    <TMLInput label="Law Firm Name" required value={formData.firm_name} onChange={e => updateField('firm_name', e.target.value)} placeholder="Smith & Associates" error={errors.firm_name} />
                    <TMLInput label="Bar Number" required value={formData.bar_number} onChange={e => updateField('bar_number', e.target.value)} placeholder="BAR123456" error={errors.bar_number} />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Practice Details</h2>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">States Where Licensed <span className="text-red-500">*</span></label>
                      {errors.states_licensed && <p className="text-red-600 text-xs mb-2">{errors.states_licensed}</p>}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                        {US_STATES.map(state => (
                          <button key={state} type="button" onClick={() => toggleArrayItem('states_licensed', state)}
                            className={`text-xs py-1.5 px-2 rounded-lg border transition-all ${formData.states_licensed.includes(state) ? 'bg-[#3a164d] text-white border-[#3a164d]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#3a164d]'}`}>
                            {state}
                          </button>
                        ))}
                      </div>
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
                    <TMLInput label="Years of Experience" type="number" required min="0" max="60" value={formData.years_experience} onChange={e => updateField('years_experience', e.target.value)} placeholder="10" error={errors.years_experience} />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Bio & Referrals</h2>
                    <TMLTextarea label="Professional Bio" required value={formData.bio} onChange={e => updateField('bio', e.target.value)} placeholder="Tell us about your legal background, specialties, and what makes you a great fit for our network..." rows={5} error={errors.bio} helperText={`${formData.bio.length} characters (min 50)`} />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-gray-700">Know other attorneys? (Optional)</label>
                        <button type="button" onClick={addReferral} className="flex items-center gap-1 text-sm text-[#3a164d] hover:underline font-medium">
                          <Plus className="w-4 h-4" /> Add Referral
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.referrals.map((ref, i) => (
                          <div key={i} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <TMLInput placeholder="Their Name" value={ref.name} onChange={e => updateReferral(i, 'name', e.target.value)} />
                              <TMLInput type="email" placeholder="their@email.com" value={ref.email} onChange={e => updateReferral(i, 'email', e.target.value)} />
                            </div>
                            <button type="button" onClick={() => removeReferral(i)} className="p-2 text-red-400 hover:text-red-600 mt-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {formData.referrals.length === 0 && (
                        <p className="text-sm text-gray-400 italic">No referrals added. You can skip this step.</p>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Submit</h2>
                    <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
                      <p className="font-semibold text-gray-700">Account Summary</p>
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

                    <div className="space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox checked={formData.consent_terms} onCheckedChange={v => updateField('consent_terms', v)} className="mt-0.5" />
                        <span className="text-sm text-gray-700">
                          I accept the{' '}
                          <a href="https://taylormadelaw.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Terms & Conditions</a>
                          {' '}and{' '}
                          <a href="https://taylormadelaw.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Privacy Policy</a>
                        </span>
                      </label>
                      {errors.consent_terms && <p className="text-red-600 text-xs">{errors.consent_terms}</p>}

                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox checked={formData.consent_referral} onCheckedChange={v => updateField('consent_referral', v)} className="mt-0.5" />
                        <span className="text-sm text-gray-700">
                          I accept the{' '}
                          <a href="https://taylormadelaw.com/referral-agreement" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Referral Agreement</a>
                          {' '}with Taylor Made Law
                        </span>
                      </label>
                      {errors.consent_referral && <p className="text-red-600 text-xs">{errors.consent_referral}</p>}
                    </div>

                    {errors.submit && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-800">{errors.submit}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  <TMLButton variant="ghost" onClick={step > 1 ? prevStep : () => setShowForm(false)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </TMLButton>

                  {step < 4 ? (
                    <TMLButton variant="primary" onClick={nextStep}>
                      Continue <ArrowRight className="w-4 h-4 ml-1" />
                    </TMLButton>
                  ) : (
                    <TMLButton variant="primary" loading={loading} onClick={handleSubmit}>
                      Create Account
                    </TMLButton>
                  )}
                </div>
              </TMLCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}