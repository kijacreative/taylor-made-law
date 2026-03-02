import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle,
  Eye, EyeOff, Briefcase, DollarSign, Users, Shield
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';
import { PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';
import StepProgress from '@/components/attorney/StepProgress';

const STEPS = [
  { number: 1, label: 'Account Info' },
  { number: 2, label: 'Practice Details' },
  { number: 3, label: 'Billing (Demo)' },
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    firm_name: '',
    password: '',
    confirm_password: '',
    bar_number: '',
    states_licensed: [],
    practice_areas: [],
    billing_plan: 'trial_6mo_then_49',
    billing_account_holder: '',
    billing_bank_name: '',
    billing_account_type: 'checking',
    billing_last4: '',
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
      if (formData.password !== formData.confirm_password) e.confirm_password = 'Passwords do not match';
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

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});
    try {
      const res = await base44.functions.invoke('joinNetwork', {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        firm_name: formData.firm_name,
        bar_number: formData.bar_number,
        states_licensed: formData.states_licensed,
        practice_areas: formData.practice_areas,
        billing_plan: formData.billing_plan,
        billing_account_holder: formData.billing_account_holder,
        billing_bank_name: formData.billing_bank_name,
        billing_account_type: formData.billing_account_type,
        billing_last4: formData.billing_last4,
      });

      if (res.data?.success) {
        // Account created — now log them in
        try {
          await base44.auth.login({ email: formData.email.toLowerCase().trim(), password: formData.password });
          navigate(createPageUrl('LawyerDashboard'), { replace: true });
        } catch (loginErr) {
          // Login failed after creation — redirect to login page
          navigate(createPageUrl('LawyerLogin') + '?created=1', { replace: true });
        }
      } else {
        setErrors({ submit: res.data?.error || 'Account creation failed. Please try again.' });
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'An error occurred.';
      if (msg.includes('already exists') || msg.includes('409')) {
        setErrors({ submit: 'An account with this email already exists. Please log in instead.' });
      } else {
        setErrors({ submit: msg });
      }
    } finally {
      setLoading(false);
    }
  };

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
                Get immediate access to pre-screened case referrals matched to your practice areas. Sign up in minutes.
              </p>
              <p className="text-white/60 mb-10 text-sm">No waiting period — your account is activated instantly.</p>
              <TMLButton variant="accent" size="lg" onClick={() => setShowForm(true)}>
                Create My Account — It's Free
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
                  <TMLCard variant="elevated" className="h-full text-center">
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
            <p className="text-gray-600 mb-8">Create your account in minutes and get immediate access to case referrals.</p>
            <TMLButton variant="primary" size="lg" onClick={() => setShowForm(true)}>
              Get Started Now
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
            <img
              src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
              alt="Taylor Made Law"
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900">Join the Attorney Network</h1>
            <p className="text-gray-500 mt-2">Create your account — instant access, no waiting period</p>
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

                {/* Step 1: Account Info */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Account Information</h2>
                      <p className="text-gray-500 text-sm">Create your login credentials and basic details.</p>
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
                        label="Create Password" type={showPassword ? 'text' : 'password'} required
                        value={formData.password} onChange={e => updateField('password', e.target.value)}
                        placeholder="Min. 8 characters" error={errors.password}
                        helperText="Use 8+ characters with a mix of letters, numbers, and symbols."
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <TMLInput
                        label="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} required
                        value={formData.confirm_password} onChange={e => updateField('confirm_password', e.target.value)}
                        placeholder="Re-enter your password" error={errors.confirm_password}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
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
                    <TMLInput label="Bar Number" required value={formData.bar_number} onChange={e => updateField('bar_number', e.target.value)} placeholder="BAR123456" error={errors.bar_number} />
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
                  </div>
                )}

                {/* Step 3: Billing (Demo) */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Billing Information</h2>
                      <p className="text-gray-500 text-sm">Demo mode — no charges will occur.</p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                      <AlertCircle className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                      <p><strong>Billing is in demo mode.</strong> We will connect Stripe later. No charges will occur at this time.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Select Your Plan</label>
                      <div className="space-y-3">
                        <label className="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-[#3a164d] has-[:checked]:border-[#3a164d] has-[:checked]:bg-[#f5f0fa]">
                          <input type="radio" name="billing_plan" value="trial_6mo_then_49" checked={formData.billing_plan === 'trial_6mo_then_49'} onChange={e => updateField('billing_plan', e.target.value)} className="mt-1 accent-[#3a164d]" />
                          <div>
                            <p className="font-semibold text-gray-900">6-Month Free Trial, then $49/month</p>
                            <p className="text-sm text-gray-500">Start for free. Billed after trial ends. Cancel anytime.</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Banking Information (Demo)</p>
                      <div className="space-y-3">
                        <TMLInput label="Account Holder Name" value={formData.billing_account_holder} onChange={e => updateField('billing_account_holder', e.target.value)} placeholder="Jane Smith" />
                        <TMLInput label="Bank Name" value={formData.billing_bank_name} onChange={e => updateField('billing_bank_name', e.target.value)} placeholder="Chase, Bank of America, etc." />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                            <select value={formData.billing_account_type} onChange={e => updateField('billing_account_type', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]">
                              <option value="checking">Checking</option>
                              <option value="savings">Savings</option>
                            </select>
                          </div>
                          <TMLInput label="Last 4 Digits" type="text" maxLength={4} value={formData.billing_last4} onChange={e => updateField('billing_last4', e.target.value.replace(/\D/g, ''))} placeholder="1234" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                      <p>Your account will be <strong>activated immediately</strong> upon submission. You'll be redirected to your attorney dashboard to complete your profile and accept the referral agreement.</p>
                    </div>

                    {errors.submit && (
                      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
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

                  {step < 3 && (
                    <TMLButton variant="primary" onClick={nextStep}>
                      Continue <ArrowRight className="w-4 h-4 ml-1" />
                    </TMLButton>
                  )}
                  {step === 3 && (
                    <TMLButton variant="primary" loading={loading} onClick={handleSubmit}>
                      Create My Account
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