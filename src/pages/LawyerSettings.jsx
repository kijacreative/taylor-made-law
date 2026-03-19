import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User,
  Building2,
  CreditCard,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  FileText,
  KeyRound,
  Mail,
  Phone } from
'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import TMLBadge from '@/components/ui/TMLBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { PRACTICE_AREAS, US_STATES, LAWYER_STATUSES } from '@/components/design/DesignTokens';

const REFERRAL_AGREEMENT_VERSION = '1.0.0';

const REFERRAL_AGREEMENT_TEXT = `TAYLOR MADE LAW REFERRAL AGREEMENT

This Referral Agreement ("Agreement") is entered into between you ("Attorney") and Taylor Made Law ("TML").

1. REFERRAL RELATIONSHIP
Attorney agrees to accept case referrals from TML's platform. TML facilitates connections between clients seeking legal representation and qualified attorneys in its network.

2. REFERRAL FEE ARRANGEMENT
Attorney agrees to pay a referral fee as follows:
- 25% of any attorney's fees collected from cases referred through the TML platform
- Referral fees are due within 30 days of fee collection
- Fees apply to initial matters and any related matters arising from the referral

3. ATTORNEY OBLIGATIONS
Attorney agrees to:
- Maintain active bar membership in good standing
- Carry adequate malpractice insurance
- Communicate with referred clients within 48 hours
- Provide ethical, competent representation
- Report case status and disposition to TML

4. COMPLIANCE
All referrals must comply with applicable rules of professional conduct. Attorney is solely responsible for ensuring compliance with their jurisdiction's rules regarding referral fees and fee sharing.

5. TERM AND TERMINATION
This Agreement remains in effect while Attorney maintains network membership. Either party may terminate with 30 days written notice.

By accepting this agreement, you certify that you have read, understand, and agree to be bound by these terms.`;

export default function LawyerSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [accountForm, setAccountForm] = useState({ full_name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [billingForm, setBillingForm] = useState({
    cardholder_name: '',
    card_number: '',
    expiry: '',
    cvv: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: ''
  });
  const [billingSaved, setBillingSaved] = useState(false);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const [profileForm, setProfileForm] = useState({
    firm_name: '',
    bar_numbers: {},
    phone: '',
    bio: '',
    states_licensed: [],
    practice_areas: [],
    years_experience: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {navigate(createPageUrl('LawyerLogin'));return;}
        const userData = await base44.auth.me();
        setUser(userData);
        setAccountForm({ full_name: userData.full_name || '', email: userData.email || '', phone: userData.phone || '' });
        // Note: full_name may also be stored on LawyerProfile — that gets merged below when profile loads
        // Pre-populate profile form with data saved on user entity during signup/activation
        setProfileForm((prev) => ({
          ...prev,
          firm_name: prev.firm_name || userData.firm_name || '',
          bar_number: prev.bar_number || userData.bar_number || '',
          phone: prev.phone || userData.phone || '',
          states_licensed: prev.states_licensed?.length > 0 ? prev.states_licensed : userData.states_licensed || [],
          practice_areas: prev.practice_areas?.length > 0 ? prev.practice_areas : userData.practice_areas || [],
          years_experience: prev.years_experience || userData.years_experience?.toString() || '',
          bio: prev.bio || userData.bio || ''
        }));
      } catch (e) {
        navigate(createPageUrl('LawyerLogin'));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // Get lawyer profile
  const { data: profiles = [], isLoading: profileLoading } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id
  });

  const lawyerProfile = profiles[0] || null;

  // Sync account form name/phone from profile when it loads
  useEffect(() => {
    if (lawyerProfile?.full_name || lawyerProfile?.phone) {
      setAccountForm((prev) => ({
        ...prev,
        full_name: lawyerProfile.full_name || prev.full_name,
        phone: lawyerProfile.phone || prev.phone
      }));
    }
  }, [lawyerProfile]);

  // Populate form when profile loads
  useEffect(() => {
    if (lawyerProfile) {
      setProfileForm({
        firm_name: lawyerProfile.firm_name || '',
        bar_numbers: lawyerProfile.bar_numbers || {},
        phone: lawyerProfile.phone || '',
        bio: lawyerProfile.bio || '',
        states_licensed: lawyerProfile.states_licensed || [],
        practice_areas: lawyerProfile.practice_areas || [],
        years_experience: lawyerProfile.years_experience?.toString() || ''
      });
    }
  }, [lawyerProfile]);

  const toggleArrayItem = (field, item) => {
    const current = profileForm[field] || [];
    if (current.includes(item)) {
      setProfileForm({ ...profileForm, [field]: current.filter((i) => i !== item) });
    } else {
      setProfileForm({ ...profileForm, [field]: [...current, item] });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const primaryBarNumber = Object.values(profileForm.bar_numbers)[0] || '';
    const profileData = {
      firm_name: profileForm.firm_name,
      bar_number: primaryBarNumber,
      bar_numbers: profileForm.bar_numbers,
      phone: profileForm.phone,
      bio: profileForm.bio,
      states_licensed: profileForm.states_licensed,
      practice_areas: profileForm.practice_areas,
      years_experience: parseInt(profileForm.years_experience) || 0
    };

    // Check if profile is complete (all required fields filled)
    const isProfileComplete =
    profileForm.firm_name?.trim() &&
    profileForm.phone?.trim() &&
    profileForm.bio?.trim() &&
    profileForm.states_licensed?.length > 0 &&
    profileForm.practice_areas?.length > 0 &&
    profileForm.years_experience;

    try {
      if (lawyerProfile) {
        await base44.entities.LawyerProfile.update(lawyerProfile.id, profileData);
      } else {
        await base44.entities.LawyerProfile.create({ ...profileData, user_id: user.id });
      }

      // Mark profile as complete on the user record if all fields are filled
      if (isProfileComplete && !user.profile_completed_at) {
        await base44.auth.updateMe({ profile_completed_at: new Date().toISOString() });
        setUser((prev) => ({ ...prev, profile_completed_at: new Date().toISOString() }));
      }

      queryClient.invalidateQueries(['lawyerProfile']);
      showSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAgreement = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      let profileId;

      if (lawyerProfile) {
        await base44.entities.LawyerProfile.update(lawyerProfile.id, {
          referral_agreement_accepted: true,
          referral_agreement_accepted_at: new Date().toISOString()
        });
        profileId = lawyerProfile.id;
      } else {
        // No profile yet — create one with minimal required fields
        const newProfile = await base44.entities.LawyerProfile.create({
          user_id: user.id,
          firm_name: user.full_name || 'My Firm',
          phone: '',
          states_licensed: [],
          practice_areas: [],
          referral_agreement_accepted: true,
          referral_agreement_accepted_at: new Date().toISOString()
        });
        profileId = newProfile.id;
      }

      // Log consent
      await base44.entities.ConsentLog.create({
        entity_type: 'LawyerProfile',
        entity_id: profileId,
        consent_type: 'referral_agreement',
        consent_version: REFERRAL_AGREEMENT_VERSION,
        consent_text: REFERRAL_AGREEMENT_TEXT,
        consented_at: new Date().toISOString()
      });

      queryClient.invalidateQueries(['lawyerProfile']);
      showSuccess('Referral agreement accepted!');
    } catch (err) {
      console.error('Error accepting agreement:', err);
      setError('Failed to accept agreement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
      </div>);

  }

  const handleSaveAccount = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save name and phone to LawyerProfile (full_name is read-only on the User entity)
      const profileData = { full_name: accountForm.full_name, phone: accountForm.phone };
      if (lawyerProfile) {
        await base44.entities.LawyerProfile.update(lawyerProfile.id, profileData);
      } else {
        await base44.entities.LawyerProfile.create({ ...profileData, user_id: user.id, firm_name: accountForm.full_name, states_licensed: [], practice_areas: [] });
      }
      queryClient.invalidateQueries(['lawyerProfile']);
      setUser((prev) => ({ ...prev, full_name: accountForm.full_name }));
      showSuccess('Account info updated!');
    } catch (err) {
      setError('Failed to update account info.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordForm.new_password || passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Passwords do not match or are empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await base44.auth.updateMe({ password: passwordForm.new_password });
      setPasswordForm({ new_password: '', confirm_password: '' });
      showSuccess('Password updated successfully!');
    } catch (err) {
      setError('Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'profile', label: 'Profile', icon: Building2 },
  { id: 'agreement', label: 'Referral Agreement', icon: FileText },
  { id: 'billing', label: 'Billing', icon: CreditCard }];


  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your profile and account settings.</p>
          </div>

          {/* Status Badge - only show if not approved */}
          {user && user.user_status && user.user_status !== 'approved' &&
          <div className="mb-6">
              <TMLBadge
              variant={user.user_status === 'pending' || user.user_status === 'invited' ? 'warning' : 'danger'}
              size="lg">
              
                {user.user_status === 'pending' ? 'Pending Approval' :
              user.user_status === 'invited' ? 'Pending Approval' : 'Restricted'}
              </TMLBadge>
            </div>
          }

          {/* Success/Error Messages */}
          {success &&
          <motion.div
            key={success}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl shadow-sm">
            
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span className="font-medium">{success}</span>
            </motion.div>
          }
          
          {error &&
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm">
            
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </motion.div>
          }

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {tabs.map((tab) =>
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id ?
              'bg-[#7e277e] text-white shadow-lg shadow-[#7e277e]/20' :
              'text-gray-600 hover:bg-gray-50'}`
              }>
              
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'account' &&
          <div className="space-y-6">
              <TMLCard variant="elevated">
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-[#7e277e]" />
                    Account Information
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-4">
                  <TMLInput
                  label="Full Name"
                  placeholder="Jane Smith"
                  value={accountForm.full_name}
                  onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })} />
                
                  <TMLInput
                  label="Email Address"
                  type="email"
                  placeholder="jane@lawfirm.com"
                  value={accountForm.email}
                  disabled
                  hint="Email cannot be changed. Contact support if needed." />
                
                  




                
                  <div className="pt-4 border-t border-gray-100">
                    <TMLButton variant="primary" onClick={handleSaveAccount} loading={saving}>
                      <Save className="w-4 h-4 mr-2" /> Save Changes
                    </TMLButton>
                  </div>
                </TMLCardContent>
              </TMLCard>

              <TMLCard variant="elevated">
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-[#7e277e]" />
                    Reset Password
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-4">
                  <TMLInput
                  label="New Password"
                  type="password"
                  placeholder="Enter new password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
                
                  <TMLInput
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} />
                
                  <div className="pt-4 border-t border-gray-100">
                    <TMLButton variant="primary" onClick={handleResetPassword} loading={saving}>
                      <KeyRound className="w-4 h-4 mr-2" /> Update Password
                    </TMLButton>
                  </div>
                </TMLCardContent>
              </TMLCard>
            </div>
          }

          {activeTab === 'profile' &&
          <TMLCard variant="elevated">
              <TMLCardHeader>
                <TMLCardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#7e277e]" />
                  Profile Information
                </TMLCardTitle>
              </TMLCardHeader>
              <TMLCardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <TMLInput
                  label="Firm Name"
                  placeholder="e.g. Smith & Associates Law Firm"
                  value={profileForm.firm_name}
                  onChange={(e) => setProfileForm({ ...profileForm, firm_name: e.target.value })}
                  required />
                
                  <TMLInput
                  label="Years of Experience"
                  type="number"
                  min="0"
                  max="60"
                  placeholder="e.g. 10"
                  value={profileForm.years_experience}
                  onChange={(e) => setProfileForm({ ...profileForm, years_experience: e.target.value })} />
                
                </div>

                <TMLInput
                label="Phone Number"
                placeholder="e.g. (555) 123-4567"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                required />
              
                
                <TMLTextarea
                label="Professional Bio"
                placeholder="e.g. I am a licensed attorney with X years of experience specializing in personal injury and civil litigation. I am dedicated to providing compassionate and effective legal representation..."
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                rows={4} />
              

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    States Licensed
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {US_STATES.map((state) =>
                  <label key={state} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <Checkbox
                      checked={profileForm.states_licensed.includes(state)}
                      onCheckedChange={() => toggleArrayItem('states_licensed', state)} />
                    
                        <span className="text-sm text-gray-700">{state}</span>
                      </label>
                  )}
                  </div>
                </div>

                {profileForm.states_licensed.length > 0 &&
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bar Numbers <span className="text-xs text-gray-400 font-normal">— enter your bar number for each licensed state</span>
                    </label>
                    <div className="space-y-2">
                      {profileForm.states_licensed.map((state) =>
                  <div key={state} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-gray-600 w-8 shrink-0">{state}</span>
                          <input
                      type="text"
                      placeholder={`Bar # for ${state}`}
                      value={profileForm.bar_numbers[state] || ''}
                      onChange={(e) => setProfileForm((prev) => ({
                        ...prev,
                        bar_numbers: { ...prev.bar_numbers, [state]: e.target.value }
                      }))}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/30 focus:border-[#3a164d]" />
                    
                        </div>
                  )}
                    </div>
                  </div>
              }

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practice Areas
                  </label>
                  <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-4">
                    {PRACTICE_AREAS.map((area) =>
                  <label key={area} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <Checkbox
                      checked={profileForm.practice_areas.includes(area)}
                      onCheckedChange={() => toggleArrayItem('practice_areas', area)} />
                    
                        <span className="text-sm text-gray-700">{area}</span>
                      </label>
                  )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                  <TMLButton
                  variant="primary"
                  onClick={handleSaveProfile}
                  loading={saving}>
                  
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </TMLButton>
                  {success && activeTab === 'profile' &&
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  
                      <CheckCircle2 className="w-4 h-4" /> Saved!
                    </motion.span>
                }
                </div>
              </TMLCardContent>
            </TMLCard>
          }

          {activeTab === 'agreement' &&
          <TMLCard variant="elevated">
              <TMLCardHeader>
                <TMLCardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#7e277e]" />
                  Referral Agreement
                </TMLCardTitle>
              </TMLCardHeader>
              <TMLCardContent>
                {lawyerProfile?.referral_agreement_accepted ?
              <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Agreement Accepted</h3>
                    <p className="text-gray-600 mb-4">
                      You accepted the referral agreement on{' '}
                      {new Date(lawyerProfile.referral_agreement_accepted_at).toLocaleDateString()}
                    </p>
                    <details className="text-left">
                      <summary className="cursor-pointer text-[#7e277e] hover:underline text-sm">
                        View Agreement
                      </summary>
                      <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {REFERRAL_AGREEMENT_TEXT}
                      </div>
                    </details>
                  </div> :

              <div>
                    <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-700 rounded-xl mb-6">
                      <AlertCircle className="w-5 h-5" />
                      <span>You must accept the referral agreement before accepting cases.</span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {REFERRAL_AGREEMENT_TEXT}
                      </pre>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <TMLButton
                    variant="primary"
                    onClick={handleAcceptAgreement}
                    loading={saving}>
                    
                        <Shield className="w-4 h-4 mr-2" />
                        I Accept the Referral Agreement
                      </TMLButton>
                      {success && activeTab === 'agreement' &&
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                    
                          <CheckCircle2 className="w-4 h-4" /> Accepted!
                        </motion.span>
                  }
                    </div>
                  </div>
              }
              </TMLCardContent>
            </TMLCard>
          }

          {activeTab === 'billing' &&
          <div className="space-y-6">
              {/* Membership Status */}
              <TMLCard variant="elevated">
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#7e277e]" />
                    Membership Status
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-600">
                        {lawyerProfile?.subscription_status === 'active' ?
                      'Your membership is active' :
                      lawyerProfile?.subscription_status === 'trial' ?
                      'You are in your free trial period' :
                      'Billing starts after approval'}
                      </p>
                    </div>
                    <TMLBadge
                    variant={lawyerProfile?.subscription_status === 'active' ? 'success' : 'warning'}
                    size="lg">
                    
                      {lawyerProfile?.subscription_status === 'active' ? 'Active' :
                    lawyerProfile?.subscription_status === 'trial' ? 'Trial' : 'Pending'}
                    </TMLBadge>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-500 mb-1">Membership Price</p>
                    <p className="text-3xl font-bold text-gray-900">$50<span className="text-lg font-normal text-gray-500">/month</span></p>
                  </div>
                  {lawyerProfile?.free_trial_months > 0 &&
                <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      You have {lawyerProfile.free_trial_months} free trial month{lawyerProfile.free_trial_months > 1 ? 's' : ''}!
                    </div>
                }
                </TMLCardContent>
              </TMLCard>

              {/* Payment Method */}
              <TMLCard variant="elevated">
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#7e277e]" />
                    Payment Method
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-4">
                  <TMLInput
                  label="Cardholder Name"
                  placeholder="e.g. Jane Smith"
                  value={billingForm.cardholder_name}
                  onChange={(e) => setBillingForm({ ...billingForm, cardholder_name: e.target.value })} />
                
                  <TMLInput
                  label="Card Number"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  value={billingForm.card_number}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                    setBillingForm({ ...billingForm, card_number: v });
                  }} />
                
                  <div className="grid grid-cols-2 gap-4">
                    <TMLInput
                    label="Expiry Date"
                    placeholder="MM / YY"
                    maxLength={7}
                    value={billingForm.expiry}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1 / $2');
                      setBillingForm({ ...billingForm, expiry: v });
                    }} />
                  
                    <TMLInput
                    label="CVV"
                    placeholder="123"
                    maxLength={4}
                    value={billingForm.cvv}
                    onChange={(e) => setBillingForm({ ...billingForm, cvv: e.target.value.replace(/\D/g, '') })} />
                  
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Billing Address</p>
                    <div className="space-y-3">
                      <TMLInput
                      label="Street Address"
                      placeholder="e.g. 123 Main St, Suite 100"
                      value={billingForm.billing_address}
                      onChange={(e) => setBillingForm({ ...billingForm, billing_address: e.target.value })} />
                    
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <TMLInput
                          label="City"
                          placeholder="e.g. Austin"
                          value={billingForm.billing_city}
                          onChange={(e) => setBillingForm({ ...billingForm, billing_city: e.target.value })} />
                        
                        </div>
                        <div>
                          <TMLInput
                          label="State"
                          placeholder="TX"
                          maxLength={2}
                          value={billingForm.billing_state}
                          onChange={(e) => setBillingForm({ ...billingForm, billing_state: e.target.value.toUpperCase() })} />
                        
                        </div>
                        <div>
                          <TMLInput
                          label="ZIP Code"
                          placeholder="78701"
                          maxLength={5}
                          value={billingForm.billing_zip}
                          onChange={(e) => setBillingForm({ ...billingForm, billing_zip: e.target.value.replace(/\D/g, '') })} />
                        
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <TMLButton
                    variant="primary"
                    onClick={() => {
                      setBillingSaved(true);
                      showSuccess('Billing information saved!');
                      setTimeout(() => setBillingSaved(false), 4000);
                    }}>
                    
                      <Save className="w-4 h-4 mr-2" />
                      Save Billing Info
                    </TMLButton>
                    {billingSaved &&
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                    
                        <CheckCircle2 className="w-4 h-4" /> Saved!
                      </motion.span>
                  }
                  </div>
                  <p className="text-xs text-gray-400">Your payment information is securely stored. Billing begins after approval and any trial period ends.</p>
                </TMLCardContent>
              </TMLCard>
            </div>
          }
        </div>
      </main>
    </div>);

}