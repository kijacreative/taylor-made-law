import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  DollarSign,
  Users,
  Shield,
  Star,
  Scale,
  Building2,
  Mail,
  MapPin } from
'lucide-react';
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


const LAWYER_CONSENT_VERSION = '1.0.0';

const LAWYER_CONSENT_TEXT = `By submitting this application, I certify that:

• I am a licensed attorney in good standing with the bar(s) of the state(s) indicated.
• The information provided in this application is accurate and complete.
• I understand membership is $50/month after approval (first 6 months may be free for qualified attorneys).
• I agree to the Taylor Made Law Network Agreement and Terms of Service.
• I understand that my membership is subject to approval and ongoing compliance requirements.

My payment method will be securely stored but not charged until my application is approved.`;

export default function ForLawyers() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  // Email verification state
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);


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
    consent: false,
    // Optional attorney invitation
    invite_attorney_name: '',
    invite_attorney_email: '',
    invite_message: ''
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }

  };

  const toggleArrayItem = (field, item) => {
    const current = formData[field] || [];
    if (current.includes(item)) {
      updateField(field, current.filter((i) => i !== item));
    } else {
      updateField(field, [...current, item]);
    }
  };

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.full_name) newErrors.full_name = 'Full name is required';
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Valid email is required';
      }
      if (!formData.password || formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
      if (!formData.phone || formData.phone.length < 10) {
        newErrors.phone = 'Valid phone number is required';
      }
      if (!formData.firm_name) newErrors.firm_name = 'Firm name is required';
      if (!formData.bar_number) newErrors.bar_number = 'Bar number is required';
    }

    if (currentStep === 2) {
      if (!formData.states_licensed || formData.states_licensed.length === 0) {
        newErrors.states_licensed = 'Select at least one state';
      }
      if (!formData.practice_areas || formData.practice_areas.length === 0) {
        newErrors.practice_areas = 'Select at least one practice area';
      }
      if (!formData.years_experience) {
        newErrors.years_experience = 'Years of experience is required';
      }
    }

    if (currentStep === 3) {
      if (!formData.bio || formData.bio.length < 50) {
        newErrors.bio = 'Please provide a bio (at least 50 characters)';
      }
      if (!formData.consent) {
        newErrors.consent = 'You must agree to the terms to proceed';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    try {
      // Send OTP to verify email first
      const res = await base44.functions.invoke('sendEmailOtp', { email: formData.email });
      if (res.data?.error) {
        setErrors({ submit: res.data.error });
        return;
      }
      // Show verification screen
      setAwaitingVerification(true);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setErrors({ submit: error.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    try {
      const res = await base44.functions.invoke('sendEmailOtp', { email: formData.email });
      if (res.data?.error) {
        setVerifyError(res.data.error);
      } else {
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) { clearInterval(interval); return 0; }
            return prev - 1;
          });
        }, 1000);
        setVerifyError('');
      }
    } catch (err) {
      setVerifyError('Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyAndComplete = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setVerifyError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      // Verify OTP
      const verifyRes = await base44.functions.invoke('verifyEmailOtp', {
        email: formData.email,
        code: verificationCode
      });
      if (!verifyRes.data?.verified) {
        setVerifyError(verifyRes.data?.error || 'Invalid code. Please try again.');
        return;
      }

      // OTP verified — now register + create profile
      await base44.auth.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name
      });
      await base44.auth.loginViaEmailPassword(formData.email, formData.password);
      const user = await base44.auth.me();

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
        subscription_status: 'none'
      });

      await base44.entities.ConsentLog.create({
        entity_type: 'LawyerProfile',
        entity_id: profile.id,
        consent_type: 'lawyer_terms',
        consent_version: LAWYER_CONSENT_VERSION,
        consent_text: LAWYER_CONSENT_TEXT,
        consented_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        entity_type: 'LawyerProfile',
        entity_id: profile.id,
        action: 'lawyer_applied',
        actor_email: formData.email,
        actor_role: 'lawyer',
        notes: `New lawyer application: ${formData.full_name}`
      });

      // Send confirmation email
      try {
        await base44.functions.invoke('sendApplicationEmails', {
          to: formData.email,
          from_name: 'Taylor Made Law Network',
          subject: 'Application Received — Taylor Made Law Network',
          body: `Dear ${formData.full_name},\n\nThank you for applying to join the Taylor Made Law attorney network!\n\nYour email has been verified and your application is now under review.\n\nApplication Summary:\n- Firm: ${formData.firm_name}\n- States: ${formData.states_licensed.join(', ')}\n- Practice Areas: ${formData.practice_areas.join(', ')}\n- Years of Experience: ${formData.years_experience}\n\nWhat Happens Next?\nOur team will review your credentials and get back to you within 2-3 business days.\n\nQuestions? Contact us at support@taylormadelaw.com\n\nBest regards,\nThe Taylor Made Law Team`
        });
      } catch (e) { /* non-critical */ }

      // Optional attorney invitation
      if (formData.invite_attorney_email) {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await base44.entities.Invitation.create({
          inviter_email: formData.email,
          inviter_name: formData.full_name,
          invitee_email: formData.invite_attorney_email,
          invitee_name: formData.invite_attorney_name || '',
          message: formData.invite_message || 'I just applied to Taylor Made Law and thought you might be interested too.',
          token,
          status: 'pending',
          sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        try {
          await base44.functions.invoke('sendApplicationEmails', {
            to: formData.invite_attorney_email,
            subject: `${formData.full_name} Invites You to Join Taylor Made Law`,
            body: `Hello${formData.invite_attorney_name ? ' ' + formData.invite_attorney_name : ''},\n\n${formData.full_name} has invited you to join the Taylor Made Law attorney network.\n\nApply now: ${window.location.origin}${createPageUrl('ForLawyers')}\n\nBest regards,\nTaylor Made Law Team`
          });
        } catch (e) { /* non-critical */ }
      }

      setSubmitted(true);
    } catch (error) {
      setVerifyError(error.message || 'An error occurred. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const benefits = [
  {
    icon: Briefcase,
    title: 'Quality Case Referrals',
    description: 'Receive pre-screened cases matched to your practice areas and jurisdiction.'
  },
  {
    icon: DollarSign,
    title: 'Grow Your Practice',
    description: 'Expand your client base with verified leads ready for representation.'
  },
  {
    icon: Users,
    title: 'Network Access',
    description: 'Connect with other legal professionals and referral opportunities.'
  },
  {
    icon: Shield,
    title: 'Compliance Support',
    description: 'We handle referral compliance and documentation for you.'
  }];


  if (awaitingVerification && !submitted) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="pt-32 pb-24 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto">
            <TMLCard variant="elevated" className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#3a164d]/10 flex items-center justify-center">
                <Mail className="w-10 h-10 text-[#3a164d]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
              <p className="text-gray-600 mb-6">
                We sent a 6-digit verification code to <strong>{formData.email}</strong>.
                Enter it below to complete your application.
              </p>

              <TMLInput
                label="Verification Code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setVerifyError('');
                }}
                className="text-center text-2xl tracking-widest font-mono"
              />

              {verifyError && (
                <div className="flex items-center gap-2 p-3 mt-3 bg-red-50 text-red-700 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              <TMLButton
                variant="primary"
                className="w-full mt-4"
                onClick={handleVerifyAndComplete}
                loading={verifyLoading}
              >
                Verify & Submit Application
              </TMLButton>

              <div className="mt-4 text-sm text-gray-500">
                Didn't receive a code?{' '}
                {resendCooldown > 0 ? (
                  <span className="text-gray-400">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    onClick={handleResendCode}
                    disabled={resendLoading}
                    className="text-[#3a164d] font-semibold hover:underline disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>
            </TMLCard>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="pt-32 pb-24 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center">

            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
            <p className="text-xl text-gray-600 mb-8">
              Thank you for applying to join Taylor Made Law. We'll review your application 
              and get back to you within 2-3 business days.
            </p>
            <TMLCard variant="cream" className="text-left mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#3a164d] mt-0.5" />
                  <span className="text-gray-700">Our team verifies your bar membership and credentials</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#3a164d] mt-0.5" />
                  <span className="text-gray-700">If approved, you'll receive account setup instructions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#3a164d] mt-0.5" />
                  <span className="text-gray-700">Start receiving case referrals matched to your expertise</span>
                </li>
              </ul>
            </TMLCard>
            <Link to={createPageUrl('Home')}>
              <TMLButton variant="primary">
                Return to Home
              </TMLButton>
            </Link>
          </motion.div>
        </div>
        <PublicFooter />
      </div>);

  }

  if (!showForm) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        
        {/* Hero */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}>

                <h1 className="text-5xl font-bold text-gray-900 mb-6">
                  Join the Taylor Made Law{' '}
                  <span className="text-[#3a164d]">Attorney Network</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Receive pre-screened, quality case referrals matched to your practice areas 
                  and jurisdiction. Build your practice with clients who need your expertise.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <TMLButton variant="primary" size="lg" onClick={() => setShowForm(true)}>
                    Apply Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </TMLButton>
                  


                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>$50/month membership</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    <span>First 6 months FREE*</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative">

                <div className="absolute -inset-4 bg-gradient-to-br from-[#3a164d]/10 to-[#993333]/10 rounded-3xl" />
                <TMLCard variant="elevated" className="relative">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3a164d] to-[#993333] flex items-center justify-center">
                      <Scale className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Network Benefits</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {['Pre-screened case referrals', 'Cases matched to your expertise', 'No per-lead fees', 'Dedicated support'].map((item) =>
                    <div key={item} className="flex items-center gap-3 bg-[#faf8f5] rounded-lg px-4 py-3">
                        <CheckCircle2 className="w-5 h-5 text-[#3a164d]" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    )}
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
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Why Attorneys Choose Taylor Made Law
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join a network designed to help you grow your practice with quality clients.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) =>
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}>

                  <TMLCard variant="cream" hover className="h-full text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <benefit.icon className="w-7 h-7 text-[#3a164d]" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 text-sm">{benefit.description}</p>
                  </TMLCard>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-gradient-to-br from-[#3a164d] to-[#993333]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Grow Your Practice?
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Join our network today and start receiving quality case referrals.
            </p>
            <TMLButton variant="accent" size="xl" onClick={() => setShowForm(true)}>
              Apply Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </TMLButton>
            <p className="text-white/60 text-sm mt-6">
              * First 6 months free for qualified attorneys, subject to approval
            </p>
          </div>
        </section>

        <PublicFooter />
      </div>);

  }

  // Application Form
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />


      
      <div className="pt-32 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Attorney Application</h1>
            <p className="text-xl text-gray-600">
              Complete the form below to apply for Taylor Made Law network membership.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-12">
            {[1, 2, 3].map((s) =>
            <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
              s < step ? 'bg-[#3a164d] text-white' :
              s === step ? 'bg-[#3a164d] text-white ring-4 ring-[#3a164d]/20' :
              'bg-gray-200 text-gray-500'}`
              }>
                  {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 3 &&
              <div className={`w-24 h-1 mx-2 rounded ${s < step ? 'bg-[#3a164d]' : 'bg-gray-200'}`} />
              }
              </React.Fragment>
            )}
          </div>

          {/* Form Steps */}
          <TMLCard variant="elevated" className="p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Info */}
              {step === 1 &&
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Account Setup</h2>
                      <p className="text-gray-500">Create your account and tell us about yourself</p>
                    </div>
                  </div>

                  <TMLInput
                  label="Full Name"
                  placeholder="John Smith"
                  value={formData.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  error={errors.full_name}
                  required />

                  <TMLInput
                  label="Email Address"
                  type="email"
                  placeholder="john@lawfirm.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  error={errors.email}
                  required />

                  <div className="grid grid-cols-2 gap-4">
                    <TMLInput
                    label="Password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    error={errors.password}
                    helperText="At least 8 characters"
                    required />

                    <TMLInput
                    label="Confirm Password"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirm_password}
                    onChange={(e) => updateField('confirm_password', e.target.value)}
                    error={errors.confirm_password}
                    required />
                  </div>

                  <TMLInput
                  label="Phone Number"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  error={errors.phone}
                  required />

                  <TMLInput
                  label="Law Firm Name"
                  placeholder="Smith & Associates"
                  value={formData.firm_name}
                  onChange={(e) => updateField('firm_name', e.target.value)}
                  error={errors.firm_name}
                  required />

                  <TMLInput
                  label="Bar Number"
                  placeholder="Your bar registration number"
                  value={formData.bar_number}
                  onChange={(e) => updateField('bar_number', e.target.value)}
                  error={errors.bar_number}
                  required />

                  <div className="flex justify-end pt-4">
                    <TMLButton variant="primary" onClick={nextStep}>
                      Continue
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </TMLButton>
                  </div>
                </motion.div>
              }

              {/* Step 2: Practice Details */}
              {step === 2 &&
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Scale className="w-6 h-6 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Practice Details</h2>
                      <p className="text-gray-500">Tell us about your practice areas and states</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      States Where Licensed <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {US_STATES.map((state) =>
                    <label key={state} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <Checkbox
                        checked={formData.states_licensed.includes(state)}
                        onCheckedChange={() => toggleArrayItem('states_licensed', state)} />

                          <span className="text-sm text-gray-700">{state}</span>
                        </label>
                    )}
                    </div>
                    {errors.states_licensed &&
                  <p className="text-sm text-red-600 mt-2">{errors.states_licensed}</p>
                  }
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Practice Areas <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-4">
                      {PRACTICE_AREAS.map((area) =>
                    <label key={area} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <Checkbox
                        checked={formData.practice_areas.includes(area)}
                        onCheckedChange={() => toggleArrayItem('practice_areas', area)} />

                          <span className="text-sm text-gray-700">{area}</span>
                        </label>
                    )}
                    </div>
                    {errors.practice_areas &&
                  <p className="text-sm text-red-600 mt-2">{errors.practice_areas}</p>
                  }
                  </div>

                  <TMLSelect
                  label="Years of Experience"
                  placeholder="Select years of experience"
                  options={[
                  { value: '1', label: '1-3 years' },
                  { value: '5', label: '4-7 years' },
                  { value: '10', label: '8-15 years' },
                  { value: '20', label: '15+ years' }]
                  }
                  value={formData.years_experience}
                  onChange={(e) => updateField('years_experience', e.target.value)}
                  error={errors.years_experience}
                  required />


                  <div className="flex justify-between pt-4">
                    <TMLButton variant="outline" onClick={prevStep}>
                      <ArrowLeft className="mr-2 w-5 h-5" />
                      Back
                    </TMLButton>
                    <TMLButton variant="primary" onClick={nextStep}>
                      Continue
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </TMLButton>
                  </div>
                </motion.div>
              }

              {/* Step 3: Bio & Consent */}
              {step === 3 &&
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Final Steps</h2>
                      <p className="text-gray-500">Complete your application</p>
                    </div>
                  </div>

                  <TMLTextarea
                  label="Professional Bio"
                  placeholder="Tell potential clients about your background, experience, and approach to practicing law..."
                  rows={6}
                  value={formData.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  error={errors.bio}
                  required />


                  {/* Optional: Invite an Attorney */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Know another attorney who should join?</h3>
                    <p className="text-sm text-gray-500 mb-4">Optional: Invite a colleague to Taylor Made Law</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <TMLInput
                      label="Attorney Name"
                      placeholder="Optional"
                      value={formData.invite_attorney_name}
                      onChange={(e) => updateField('invite_attorney_name', e.target.value)} />

                      <TMLInput
                      label="Attorney Email"
                      type="email"
                      placeholder="Optional"
                      value={formData.invite_attorney_email}
                      onChange={(e) => updateField('invite_attorney_email', e.target.value)} />

                    </div>
                  </div>

                  {/* Consent */}
                  <div className="pt-6 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-[#3a164d] mt-0.5" />
                        <div className="text-sm text-gray-600">
                          <p className="font-medium text-gray-900 mb-2">Terms & Agreement</p>
                          <p className="whitespace-pre-line text-xs">{LAWYER_CONSENT_TEXT}</p>
                        </div>
                      </div>
                    </div>
                    
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                      type="checkbox"
                      checked={formData.consent}
                      onChange={(e) => updateField('consent', e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-[#3a164d] focus:ring-[#3a164d]" />

                      <span className="text-sm text-gray-700">
                        I certify the information provided is accurate and agree to the terms above.
                      </span>
                    </label>
                    {errors.consent &&
                  <p className="text-sm text-red-600 mt-2">{errors.consent}</p>
                  }
                  </div>

                  {errors.submit &&
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
                      <AlertCircle className="w-5 h-5" />
                      <span>{errors.submit}</span>
                    </div>
                }

                  {/* Email Verification Code */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                      If you received a verification code by email, enter it below:
                    </p>
                    <TMLInput
                      label="Email Verification Code"
                      placeholder="Enter code (optional)"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-between pt-4">
                    <TMLButton variant="outline" onClick={prevStep}>
                      <ArrowLeft className="mr-2 w-5 h-5" />
                      Back
                    </TMLButton>
                    <TMLButton
                    variant="primary"
                    onClick={handleSubmit}
                    loading={loading}>

                      Submit Application
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </TMLButton>
                  </div>
                </motion.div>
              }
            </AnimatePresence>
          </TMLCard>
        </div>
      </div>

      <PublicFooter />
    </div>);

}