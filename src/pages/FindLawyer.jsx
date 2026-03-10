import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Scale,
  Clock,
  Phone,
  Mail,
  User,
  FileText,
  Shield } from
'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import TMLSelect from '@/components/ui/TMLSelect';
import { PRACTICE_AREAS, US_STATES, URGENCY_LEVELS } from '@/components/design/DesignTokens';

const CONSENT_VERSION = '1.0.0';

const CONSENT_TEXT = `By submitting this form, I consent to Taylor Made Law collecting my personal information to facilitate connecting me with a qualified attorney. I understand that:

• My information will be shared with attorneys in the Taylor Made Law network who practice in the relevant area and jurisdiction.
• I may be contacted by phone, email, or text message regarding my legal matter.
• Submitting this form does not create an attorney-client relationship.
• I have read and agree to the Terms of Service and Privacy Policy.

This consent can be withdrawn at any time by contacting us.`;

export default function FindLawyer() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    practice_area: '',
    state: '',
    description: '',
    urgency: 'medium',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
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

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.practice_area) newErrors.practice_area = 'Please select a practice area';
      if (!formData.state) newErrors.state = 'Please select a state';
    }

    if (currentStep === 2) {
      if (!formData.description || formData.description.length < 20) {
        newErrors.description = 'Please provide more details about your situation (at least 20 characters)';
      }
    }

    if (currentStep === 3) {
      if (!formData.first_name) newErrors.first_name = 'First name is required';
      if (!formData.last_name) newErrors.last_name = 'Last name is required';
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Valid email is required';
      }
      if (!formData.phone || formData.phone.length < 10) {
        newErrors.phone = 'Valid phone number is required';
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
      await base44.functions.invoke('submitFindLawyerLead', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        practice_area: formData.practice_area,
        state: formData.state,
        description: formData.description,
        urgency: formData.urgency,
        consent: formData.consent,
        invite_attorney_email: formData.invite_attorney_email || null,
        invite_attorney_name: formData.invite_attorney_name || null,
        invite_message: formData.invite_message || null,
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
            <p className="text-xl text-gray-600 mb-8">
              Your request has been submitted successfully. Our team is reviewing your information 
              and will work to match you with a qualified attorney.
            </p>
            <TMLCard variant="cream" className="text-left mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#3a164d] mt-0.5" />
                  <span className="text-gray-700">Our team reviews your case details</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#3a164d] mt-0.5" />
                  <span className="text-gray-700">We match you with qualified attorneys in our network</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#3a164d] mt-0.5" />
                  <span className="text-gray-700">You'll be contacted within 24-48 hours</span>
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

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />
      
      <div className="pt-32 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Your Perfect Legal Fit</h1>
            <p className="text-xl text-gray-600">
              Tell us about your legal needs and we'll connect you with qualified attorneys.
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
              {/* Step 1: Case Type & Location */}
              {step === 1 &&
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <Scale className="w-6 h-6 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">What type of legal help do you need?</h2>
                      <p className="text-gray-500">Select your case type and location</p>
                    </div>
                  </div>

                  <TMLSelect
                  label="Practice Area"
                  placeholder="Select the type of legal matter"
                  options={PRACTICE_AREAS}
                  value={formData.practice_area}
                  onChange={(e) => updateField('practice_area', e.target.value)}
                  error={errors.practice_area}
                  required />


                  <TMLSelect
                  label="State"
                  placeholder="Select your state"
                  options={US_STATES}
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  error={errors.state}
                  required />


                  <div className="flex justify-end pt-4">
                    <TMLButton variant="primary" onClick={nextStep}>
                      Continue
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </TMLButton>
                  </div>
                </motion.div>
              }

              {/* Step 2: Case Details */}
              {step === 2 &&
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Tell us more about your situation</h2>
                      <p className="text-gray-500">This helps us match you with the right attorney</p>
                    </div>
                  </div>

                  <TMLTextarea
                  label="Description of Your Legal Matter"
                  placeholder="Please describe your situation in detail. Include relevant dates, parties involved, and any other information that would help an attorney understand your case."
                  rows={6}
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  error={errors.description}
                  required />


                  <TMLSelect
                  label="Urgency Level"
                  options={URGENCY_LEVELS.map((u) => ({ value: u.value, label: u.label }))}
                  value={formData.urgency}
                  onChange={(e) => updateField('urgency', e.target.value)} />


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

              {/* Step 3: Contact Info & Consent */}
              {step === 3 &&
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#3a164d]/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-[#3a164d]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Your Contact Information</h2>
                      <p className="text-gray-500">How can an attorney reach you?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <TMLInput
                    label="First Name"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    error={errors.first_name}
                    required />

                    <TMLInput
                    label="Last Name"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    error={errors.last_name}
                    required />

                  </div>

                  <TMLInput
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  error={errors.email}
                  required />


                  <TMLInput
                  label="Phone Number"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  error={errors.phone}
                  required />


                  {/* Optional: Invite an Attorney */}
                  




















                  {/* Consent */}
                  <div className="pt-6 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-[#3a164d] mt-0.5" />
                        <div className="text-sm text-gray-600">
                          <p className="font-medium text-gray-900 mb-2">Terms & Consent</p>
                          <p className="whitespace-pre-line text-xs">{CONSENT_TEXT}</p>
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
                        I have read and agree to the terms above, including the Privacy Policy and Terms of Service.
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

                  <div className="flex justify-between pt-4">
                    <TMLButton variant="outline" onClick={prevStep}>
                      <ArrowLeft className="mr-2 w-5 h-5" />
                      Back
                    </TMLButton>
                    <TMLButton
                    variant="primary"
                    onClick={handleSubmit}
                    loading={loading}>

                      Submit Request
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