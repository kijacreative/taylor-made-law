/**
 * JoinNetwork — Option 2: Auto-approve first, review later.
 * Lawyers sign up immediately with email + password.
 * Base44 handles OTP email verification → lawyer logs in right away.
 * Admin reviews after, not before.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Mail,
  Briefcase, DollarSign, Users, Shield, Loader2, Eye, EyeOff
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';
import { Checkbox } from '@/components/ui/checkbox';
import { PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';

const STEPS = [
  { number: 1, label: 'Account Setup' },
  { number: 2, label: 'Practice Details' },
];

const benefits = [
  { icon: Briefcase, title: 'Quality Case Referrals', description: 'Pre-screened cases matched to your practice areas and jurisdiction.' },
  { icon: DollarSign, title: 'Grow Your Practice', description: 'Expand your client base with verified leads ready for representation.' },
  { icon: Users, title: 'Network Access', description: 'Connect with other legal professionals and referral opportunities.' },
  { icon: Shield, title: 'Compliance Support', description: 'We handle referral compliance and documentation for you.' },
];

export default function JoinNetwork() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    firm_name: '',
    bar_number: '',
    states_licensed: [],
    practice_areas: [],
    years_experience: '',
    bio: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
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
      if (!/[0-9]/.test(formData.password)) e.password = 'Password must include at least one number';
      if (!/[a-zA-Z]/.test(formData.password)) e.password = 'Password must include at least one letter';
      if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (!formData.acceptTerms) e.acceptTerms = 'You must accept the Terms & Conditions';
      if (!formData.acceptPrivacy) e.acceptPrivacy = 'You must accept the Privacy Policy';
    }
    if (s === 2) {
      if (!formData.states_licensed.length) e.states_licensed = 'Select at least one state';
      if (!formData.practice_areas.length) e.practice_areas = 'Select at least one practice area';
      if (!formData.bar_number.trim()) e.bar_number = 'Bar number is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await base44.functions.invoke('joinLawyerNetwork', {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        firm_name: formData.firm_name,
        bar_number: formData.bar_number,
        states_licensed: formData.states_licensed,
        practice_areas: formData.practice_areas,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        bio: formData.bio || null,
        password: formData.password,
      });

      if (res.data?.success) {
        setSubmitted(true);
      } else if (res.data?.already_exists) {
        setErrors({ submit: 'An account with this email already exists. Please sign in.' });
      } else {
        setErrors({ submit: res.data?.error || 'Submission failed. Please try again.' });
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'An error occurred.';
      if (errMsg.toLowerCase().includes('already exists')) {
        setErrors({ submit: 'An account with this email already exists. Please sign in.' });
      } else {
        setErrors({ submit: errMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  // Success — redirect to login so Base44 OTP verification completes normally
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center min-h-screen px-4 pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl text-center p-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
              <p className="text-gray-700 mb-3">
                Welcome to the Taylor Made Law Network, <strong>{formData.full_name.split(' ')[0]}</strong>!
              </p>
              <p className="text-gray-600 mb-6">
                We sent a verification code to <strong>{formData.email}</strong>. Enter it when prompted to verify your email and log in.
              </p>
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-6 text-left">
                <Mail className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700">Check your spam folder if you don't see the verification email.</p>
              </div>
              <Link to={createPageUrl('LawyerLogin')}>
                <TMLButton variant="primary" className="w-full">Sign In to Continue →</TMLButton>
              </Link>
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
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Join the Attorney Network</h1>
              <p className="text-xl text-white/80 max-w-2xl mx-auto mb-4">
                Sign up instantly. Verify your email. Access the lawyer portal immediately.
              </p>
              <p className="text-white/60 mb-10 text-sm">No waiting for approval — get started today.</p>
              <TMLButton variant="accent" size="lg" onClick={() => setShowForm(true)}>
                Create Your Account — It's Free
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
            <p className="text-gray-600 mb-8">Create your account in minutes and start accessing case referrals today.</p>
            <TMLButton variant="primary" size="lg" onClick={() => setShowForm(true)}>
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
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
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
              alt="Taylor Made Law"
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
            <p className="text-gray-500 mt-2">Join the network — verify your email and log in immediately</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.number}>
                <div className={`flex items-center gap-2 ${step === s.number ? 'text-[#3a164d]' : step > s.number ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                    ${step > s.number ? 'bg-emerald-500 border-emerald-500 text-white' :
                      step === s.number ? 'bg-[#3a164d] border-[#3a164d] text-white' :
                      'bg-white border-gray-300 text-gray-400'}`}>
                    {step > s.number ? '✓' : s.number}
                  </div>
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-12 h-px bg-gray-200" />}
              </React.Fragment>
            ))}
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
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Account Setup</h2>
                      <p className="text-gray-500 text-sm">Create your account to join the network.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <TMLInput label="Full Name" required value={formData.full_name} onChange={e => updateField('full_name', e.target.value)} placeholder="Jane Smith" error={errors.full_name} />
                      <TMLInput label="Law Firm Name" required value={formData.firm_name} onChange={e => updateField('firm_name', e.target.value)} placeholder="Smith & Associates" error={errors.firm_name} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <TMLInput label="Email Address" type="email" required value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="jane@smithlaw.com" error={errors.email} />
                      <TMLInput label="Phone Number" type="tel" required value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(555) 555-5555" error={errors.phone} />
                    </div>
                    <div className="relative">
                      <TMLInput
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={e => updateField('password', e.target.value)}
                        placeholder="Min 8 characters with letters & numbers"
                        error={errors.password}
                        helperText="At least 8 characters with a mix of letters and numbers"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <TMLInput
                        label="Confirm Password"
                        type={showConfirm ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={e => updateField('confirmPassword', e.target.value)}
                        placeholder="Confirm your password"
                        error={errors.confirmPassword}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox checked={formData.acceptTerms} onCheckedChange={v => updateField('acceptTerms', !!v)} className="mt-0.5" />
                          <span className="text-sm text-gray-700">
                            I accept the <a href="https://taylormadelaw.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Terms & Conditions</a>
                          </span>
                        </label>
                        {errors.acceptTerms && <p className="text-xs text-red-600 ml-7 mt-1">{errors.acceptTerms}</p>}
                      </div>
                      <div>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox checked={formData.acceptPrivacy} onCheckedChange={v => updateField('acceptPrivacy', !!v)} className="mt-0.5" />
                          <span className="text-sm text-gray-700">
                            I accept the <a href="https://taylormadelaw.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Privacy Policy</a>
                          </span>
                        </label>
                        {errors.acceptPrivacy && <p className="text-xs text-red-600 ml-7 mt-1">{errors.acceptPrivacy}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Practice Details */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Practice Details</h2>
                      <p className="text-gray-500 text-sm">Tell us about your legal practice.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <TMLInput label="Bar Number" required value={formData.bar_number} onChange={e => updateField('bar_number', e.target.value)} placeholder="BAR123456" error={errors.bar_number} />
                      <TMLInput label="Years of Experience" type="number" min="0" max="60" value={formData.years_experience} onChange={e => updateField('years_experience', e.target.value)} placeholder="e.g. 8" />
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

                    {errors.submit && (
                      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-red-800">{errors.submit}</p>
                          {errors.submit?.toLowerCase().includes('already exists') && (
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
                    <TMLButton variant="ghost" onClick={() => setStep(step - 1)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </TMLButton>
                  ) : (
                    <TMLButton variant="ghost" onClick={() => setShowForm(false)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </TMLButton>
                  )}

                  {step < 2 && (
                    <TMLButton variant="primary" onClick={nextStep}>
                      Continue <ArrowRight className="w-4 h-4 ml-1" />
                    </TMLButton>
                  )}
                  {step === 2 && (
                    <TMLButton variant="primary" loading={loading} onClick={handleSubmit}>
                      Create Account
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