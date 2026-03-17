import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff
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

const STEPS = [
  { number: 1, label: 'Your Info' },
  { number: 2, label: 'Practice' },
  { number: 3, label: 'Submit' },
];

function StepDots({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.number}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s.number < current ? 'bg-emerald-500 text-white' :
              s.number === current ? 'bg-[#3a164d] text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {s.number < current ? <CheckCircle2 className="w-4 h-4" /> : s.number}
            </div>
            <span className={`text-xs font-medium ${s.number === current ? 'text-[#3a164d]' : 'text-gray-400'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-px w-12 mb-4 ${s.number < current ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function JoinLawyerNetwork() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    firm_name: '',
    bar_numbers: {},
    years_experience: '',
    states_licensed: [],
    practice_areas: [],
    bio: '',
    password: '',
    confirm_password: '',
    consent_terms: false,
  });

  const set = (field, value) => {
    setFormData(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: null }));
  };

  const toggleItem = (field, item) => {
    const cur = formData[field] || [];
    set(field, cur.includes(item) ? cur.filter(i => i !== item) : [...cur, item]);
  };

  const setBarNumber = (state, value) => {
    setFormData(p => ({ ...p, bar_numbers: { ...p.bar_numbers, [state]: value } }));
  };

  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!formData.full_name.trim()) e.full_name = 'Required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Valid email required';
      if (!formData.firm_name.trim()) e.firm_name = 'Required';
      if (!formData.password || formData.password.length < 8) e.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirm_password) e.confirm_password = 'Passwords do not match';
    }
    if (s === 2) {
      if (!formData.states_licensed.length) e.states_licensed = 'Select at least one state';
      if (!formData.practice_areas.length) e.practice_areas = 'Select at least one practice area';
      const missingBarNumbers = formData.states_licensed.filter(st => !formData.bar_numbers[st]?.trim());
      if (missingBarNumbers.length) e.bar_numbers = `Enter bar number for: ${missingBarNumbers.join(', ')}`;
    }
    if (s === 3) {
      if (!formData.consent_terms) e.consent_terms = 'You must accept the Terms & Privacy Policy';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!validate(3)) return;
    setLoading(true);
    setSubmitError('');
    try {
      const email = formData.email.trim().toLowerCase();

      // Call backend function via SDK invoke
      const response = await base44.functions.invoke('publicLawyerSignup', {
        full_name: formData.full_name,
        email,
        password: formData.password,
        phone: formData.phone,
        firm_name: formData.firm_name,
        bar_numbers: formData.bar_numbers,
        bar_number: Object.values(formData.bar_numbers)[0] || '',
        years_experience: Number(formData.years_experience) || 0,
        states_licensed: formData.states_licensed,
        practice_areas: formData.practice_areas,
        bio: formData.bio,
        consent_terms: formData.consent_terms,
      });

      const result = response.data;
      if (!result.success) {
        if (result.error_code === 'email_taken') {
          setSubmitError('An account with this email already exists. Please sign in or use a different email.');
        } else {
          setSubmitError(result.error || 'An error occurred. Please try again.');
        }
        return;
      }

      // Redirect to email verification
      navigate(`/verify-email?email=${encodeURIComponent(email)}&new=1`, { replace: true });
    } catch (err) {
      const data = err?.response?.data || {};
      const msg = data.error || data.message || err?.message || '';
      setSubmitError(typeof msg === 'string' && msg ? msg : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Join the Taylor Made Law Network</h1>
            <p className="text-gray-500 mt-2">Complete the form below to apply as a referring attorney.</p>
          </div>

          <StepDots steps={STEPS} current={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TMLCard variant="elevated" className="p-8">
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-gray-900">Contact & Firm Info</h2>
                    <TMLInput label="Full Name" required value={formData.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Smith" error={errors.full_name} />
                    <TMLInput label="Email Address" type="email" required value={formData.email} onChange={e => set('email', e.target.value)} placeholder="jane@smithlaw.com" error={errors.email} />
                    <TMLInput label="Phone Number" type="tel" value={formData.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" />
                    <TMLInput label="Law Firm Name" required value={formData.firm_name} onChange={e => set('firm_name', e.target.value)} placeholder="Smith & Associates" error={errors.firm_name} />
                    <div className="grid grid-cols-2 gap-4">
                      <TMLInput label="Bar Number" value={formData.bar_number} onChange={e => set('bar_number', e.target.value)} placeholder="BAR123456" />
                      <TMLInput label="Years of Experience" type="number" min="0" max="60" value={formData.years_experience} onChange={e => set('years_experience', e.target.value)} placeholder="10" />
                    </div>
                    <div className="pt-2 border-t border-gray-100 space-y-4">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Create Your Password</p>
                      <div className="relative">
                        <TMLInput
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={e => set('password', e.target.value)}
                          placeholder="Minimum 8 characters"
                          error={errors.password}
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <TMLInput
                          label="Confirm Password"
                          type={showConfirm ? 'text' : 'password'}
                          required
                          value={formData.confirm_password}
                          onChange={e => set('confirm_password', e.target.value)}
                          placeholder="Re-enter your password"
                          error={errors.confirm_password}
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900">Practice Details</h2>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">States Licensed <span className="text-red-500">*</span></label>
                      {errors.states_licensed && <p className="text-red-600 text-xs mb-2">{errors.states_licensed}</p>}
                      <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-white">
                        {US_STATES.map(state => (
                          <button key={state} type="button" onClick={() => toggleItem('states_licensed', state)}
                            className={`text-xs py-1.5 px-1 rounded-lg border transition-all ${formData.states_licensed.includes(state) ? 'bg-[#3a164d] text-white border-[#3a164d]' : 'text-gray-600 border-gray-200 hover:border-[#3a164d]'}`}>
                            {state}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.states_licensed.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Bar Numbers <span className="text-red-500">*</span>
                          <span className="text-gray-400 font-normal ml-1">— enter your bar number for each selected state</span>
                        </label>
                        {errors.bar_numbers && <p className="text-red-600 text-xs mb-2">{errors.bar_numbers}</p>}
                        <div className="space-y-2">
                          {formData.states_licensed.map(state => (
                            <div key={state} className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-600 w-8 shrink-0">{state}</span>
                              <input
                                type="text"
                                placeholder={`Bar # for ${state}`}
                                value={formData.bar_numbers[state] || ''}
                                onChange={e => setBarNumber(state, e.target.value)}
                                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/30 focus:border-[#3a164d]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Practice Areas <span className="text-red-500">*</span></label>
                      {errors.practice_areas && <p className="text-red-600 text-xs mb-2">{errors.practice_areas}</p>}
                      <div className="flex flex-wrap gap-2">
                        {PRACTICE_AREAS.map(area => (
                          <button key={area} type="button" onClick={() => toggleItem('practice_areas', area)}
                            className={`text-sm py-1.5 px-3 rounded-full border transition-all ${formData.practice_areas.includes(area) ? 'bg-[#3a164d] text-white border-[#3a164d]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#3a164d]'}`}>
                            {area}
                          </button>
                        ))}
                      </div>
                    </div>
                    <TMLTextarea label="Short Bio (optional)" value={formData.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell us about your background and specialties..." rows={3} />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-gray-900">Review & Submit</h2>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                      {[
                        ['Name', formData.full_name],
                        ['Email', formData.email],
                        ['Firm', formData.firm_name],
                        ['Bar #s', Object.entries(formData.bar_numbers).map(([st, num]) => `${st}: ${num}`).join(', ') || '—'],
                        ['Experience', formData.years_experience ? `${formData.years_experience} years` : '—'],
                        ['States', (formData.states_licensed.slice(0, 5).join(', ') + (formData.states_licensed.length > 5 ? ` +${formData.states_licensed.length - 5}` : '')) || '—'],
                        ['Practice Areas', (formData.practice_areas.slice(0, 3).join(', ') + (formData.practice_areas.length > 3 ? ` +${formData.practice_areas.length - 3}` : '')) || '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="grid grid-cols-2 gap-2">
                          <span className="font-medium text-gray-500">{label}</span>
                          <span className="text-gray-800">{val}</span>
                        </div>
                      ))}
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={formData.consent_terms} onCheckedChange={v => set('consent_terms', v)} className="mt-0.5" />
                      <span className="text-sm text-gray-700">
                        I accept the{' '}
                        <a href="https://taylormadelaw.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Terms & Conditions</a>
                        {' '}and{' '}
                        <a href="https://taylormadelaw.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#3a164d] hover:underline">Privacy Policy</a>
                      </span>
                    </label>
                    {errors.consent_terms && <p className="text-red-600 text-xs">{errors.consent_terms}</p>}

                    {submitError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-800">{submitError}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  <TMLButton variant="ghost" onClick={back} disabled={step === 1}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </TMLButton>
                  {step < 3 ? (
                    <TMLButton variant="primary" onClick={next}>
                      Continue <ArrowRight className="w-4 h-4 ml-1" />
                    </TMLButton>
                  ) : (
                    <TMLButton variant="primary" loading={loading} onClick={handleSubmit}>
                      Create Account <ArrowRight className="w-4 h-4 ml-1" />
                    </TMLButton>
                  )}
                </div>
              </TMLCard>
            </motion.div>
          </AnimatePresence>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-[#3a164d] font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}