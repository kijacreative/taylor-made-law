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
      // Send to Lead Docket webhook first
      try {
        const webhookData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          state: formData.state,
          practice_area: formData.practice_area,
          description: formData.description,
          urgency: formData.urgency
        };

        await fetch('https://taylormadelaw.leaddocket.com/opportunities/form/1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookData)
        });
      } catch (webhookErr) {
        console.log('Lead Docket webhook send attempted');
      }

      // Create lead
      const leadData = {
        practice_area: formData.practice_area,
        state: formData.state,
        description: formData.description,
        urgency: formData.urgency,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        consent_given: true,
        consent_version: CONSENT_VERSION,
        status: 'new',
        source: 'website'
      };

      const lead = await base44.entities.Lead.create(leadData);

      // Create consent log
      await base44.entities.ConsentLog.create({
        entity_type: 'Lead',
        entity_id: lead.id,
        consent_type: 'intake_terms',
        consent_version: CONSENT_VERSION,
        consent_text: CONSENT_TEXT,
        consented_at: new Date().toISOString()
      });

      // Send confirmation email to client
      try {
        await base44.integrations.Core.SendEmail({
          to: formData.email,
          from_name: 'Taylor Made Law',
          subject: 'We Received Your Request — Taylor Made Law',
          body: `
            <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #faf8f5;">
              <div style="text-align: center; margin-bottom: 32px;">
                <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 50px;" />
              </div>

              <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <span style="font-size: 28px;">✓</span>
                  </div>
                  <h1 style="color: #111827; font-size: 26px; font-weight: 700; margin: 0 0 8px;">Thank You, ${formData.first_name}!</h1>
                  <p style="color: #6b7280; font-size: 16px; margin: 0;">Your request has been submitted successfully.</p>
                </div>

                <p style="color: #374151; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
                  Our team is reviewing your information and will work to match you with a qualified attorney in our network. You can expect to hear from us within <strong>24–48 hours</strong>.
                </p>

                <div style="background: #f5f0fa; border-left: 4px solid #3a164d; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
                  <p style="color: #3a164d; font-weight: 600; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Submission Summary</p>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
                    <tr><td style="padding: 4px 0; color: #6b7280; width: 40%;">Practice Area</td><td style="padding: 4px 0; font-weight: 500;">${formData.practice_area}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">State</td><td style="padding: 4px 0; font-weight: 500;">${formData.state}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Urgency</td><td style="padding: 4px 0; font-weight: 500; text-transform: capitalize;">${formData.urgency}</td></tr>
                  </table>
                </div>

                <p style="color: #374151; font-weight: 600; font-size: 15px; margin-bottom: 12px;">What happens next?</p>
                <ul style="color: #374151; font-size: 14px; line-height: 1.8; padding-left: 0; list-style: none; margin: 0 0 28px;">
                  <li style="padding: 6px 0; display: flex; gap: 10px;"><span style="color: #3a164d; font-weight: 700;">✓</span> Our team reviews your case details</li>
                  <li style="padding: 6px 0; display: flex; gap: 10px;"><span style="color: #3a164d; font-weight: 700;">✓</span> We match you with qualified attorneys in our network</li>
                  <li style="padding: 6px 0; display: flex; gap: 10px;"><span style="color: #3a164d; font-weight: 700;">✓</span> You'll be contacted within 24–48 hours</li>
                </ul>

                <p style="color: #6b7280; font-size: 13px; margin: 0;">
                  Questions? Contact us at <a href="mailto:support@taylormadelaw.com" style="color: #3a164d;">support@taylormadelaw.com</a>
                </p>
              </div>

              <div style="margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
              </div>
            </div>
          `
        });
      } catch (emailErr) {
        console.log('Email send attempted');
      }

      // Send alert email to all admin accounts
      try {
        const allUsers = await base44.entities.User.list();
        const adminUsers = allUsers.filter((u) => u.role === 'admin');

        for (const admin of adminUsers) {
          await base44.integrations.Core.SendEmail({
            to: admin.email,
            from_name: 'Taylor Made Law Alerts',
            subject: `🔔 New Lead: ${formData.first_name} ${formData.last_name} — ${formData.practice_area}`,
            body: `
              <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <img src="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp" alt="Taylor Made Law" style="height: 44px;" />
                </div>
                <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                    <div style="background: #fef3c7; border-radius: 8px; padding: 8px 12px; font-size: 20px;">🔔</div>
                    <div>
                      <h2 style="margin: 0; color: #111827; font-size: 20px; font-weight: 700;">New Lead Submitted</h2>
                      <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Lead ID: ${lead.id}</p>
                    </div>
                  </div>

                  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin: 0 0 12px;">Client Information</p>
                    <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
                      <tr><td style="padding: 5px 0; color: #6b7280; width: 35%;">Name</td><td style="padding: 5px 0; font-weight: 600;">${formData.first_name} ${formData.last_name}</td></tr>
                      <tr><td style="padding: 5px 0; color: #6b7280;">Email</td><td style="padding: 5px 0;"><a href="mailto:${formData.email}" style="color: #3a164d;">${formData.email}</a></td></tr>
                      <tr><td style="padding: 5px 0; color: #6b7280;">Phone</td><td style="padding: 5px 0;"><a href="tel:${formData.phone}" style="color: #3a164d;">${formData.phone}</a></td></tr>
                    </table>
                  </div>

                  <div style="background: #f5f0fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <p style="color: #3a164d; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin: 0 0 12px;">Case Details</p>
                    <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
                      <tr><td style="padding: 5px 0; color: #6b7280; width: 35%;">Practice Area</td><td style="padding: 5px 0; font-weight: 600;">${formData.practice_area}</td></tr>
                      <tr><td style="padding: 5px 0; color: #6b7280;">State</td><td style="padding: 5px 0; font-weight: 600;">${formData.state}</td></tr>
                      <tr><td style="padding: 5px 0; color: #6b7280;">Urgency</td><td style="padding: 5px 0; font-weight: 600; text-transform: capitalize;">${formData.urgency}</td></tr>
                    </table>
                  </div>

                  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin: 0 0 10px;">Description</p>
                    <p style="color: #374151; font-size: 14px; line-height: 1.7; margin: 0;">${formData.description}</p>
                  </div>

                  <a href="${window.location.origin}/admin-leads" style="display: block; background: linear-gradient(135deg, #3a164d 0%, #993333 100%); color: white; text-align: center; padding: 14px 24px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 15px;">
                    Review Lead in Dashboard →
                  </a>
                </div>
                <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} Taylor Made Law</p>
              </div>
            `
          });
        }
      } catch (adminEmailErr) {
        console.log('Admin notification email attempted');
      }

      // Handle attorney invitation if provided
      if (formData.invite_attorney_email) {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        await base44.entities.Invitation.create({
          inviter_email: formData.email,
          inviter_name: `${formData.first_name} ${formData.last_name}`,
          invitee_email: formData.invite_attorney_email,
          invitee_name: formData.invite_attorney_name || '',
          message: formData.invite_message || 'I thought you might be interested in joining the Taylor Made Law network.',
          token: token,
          status: 'pending',
          sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });

        // Send invitation email
        try {
          await base44.integrations.Core.SendEmail({
            to: formData.invite_attorney_email,
            subject: 'You\'ve Been Invited to Join Taylor Made Law',
            body: `
Hello${formData.invite_attorney_name ? ' ' + formData.invite_attorney_name : ''},

${formData.first_name} ${formData.last_name} has invited you to join the Taylor Made Law attorney network.

${formData.invite_message ? `Personal message: "${formData.invite_message}"` : ''}

Taylor Made Law connects qualified attorneys with pre-screened clients seeking legal representation. Join our network to receive quality case referrals matched to your practice areas and jurisdiction.

Benefits of joining:
• Receive pre-screened, quality case referrals
• Build your practice with clients matched to your expertise
• Flexible membership with first 6 months free for qualified attorneys

Learn more and apply: ${window.location.origin}${createPageUrl('ForLawyers')}

Best regards,
Taylor Made Law Team
            `.trim()
          });
        } catch (inviteErr) {
          console.log('Invitation email send attempted');
        }
      }

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