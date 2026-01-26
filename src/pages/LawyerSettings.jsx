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
  FileText
} from 'lucide-react';
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

  const [profileForm, setProfileForm] = useState({
    firm_name: '',
    bar_number: '',
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
        if (!isAuth) {
          navigate(createPageUrl('Home'));
          return;
        }
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        navigate(createPageUrl('Home'));
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
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles[0] || null;

  // Populate form when profile loads
  useEffect(() => {
    if (lawyerProfile) {
      setProfileForm({
        firm_name: lawyerProfile.firm_name || '',
        bar_number: lawyerProfile.bar_number || '',
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
      setProfileForm({ ...profileForm, [field]: current.filter(i => i !== item) });
    } else {
      setProfileForm({ ...profileForm, [field]: [...current, item] });
    }
  };

  const handleSaveProfile = async () => {
    if (!lawyerProfile) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await base44.entities.LawyerProfile.update(lawyerProfile.id, {
        firm_name: profileForm.firm_name,
        bar_number: profileForm.bar_number,
        phone: profileForm.phone,
        bio: profileForm.bio,
        states_licensed: profileForm.states_licensed,
        practice_areas: profileForm.practice_areas,
        years_experience: parseInt(profileForm.years_experience) || 0
      });
      
      queryClient.invalidateQueries(['lawyerProfile']);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAgreement = async () => {
    if (!lawyerProfile) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await base44.entities.LawyerProfile.update(lawyerProfile.id, {
        referral_agreement_accepted: true,
        referral_agreement_accepted_at: new Date().toISOString()
      });
      
      // Log consent
      await base44.entities.ConsentLog.create({
        entity_type: 'LawyerProfile',
        entity_id: lawyerProfile.id,
        consent_type: 'referral_agreement',
        consent_version: REFERRAL_AGREEMENT_VERSION,
        consent_text: REFERRAL_AGREEMENT_TEXT,
        consented_at: new Date().toISOString()
      });
      
      queryClient.invalidateQueries(['lawyerProfile']);
      setSuccess('Referral agreement accepted!');
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
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'agreement', label: 'Referral Agreement', icon: FileText },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

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

          {/* Status Badge */}
          {lawyerProfile && (
            <div className="mb-6">
              <TMLBadge 
                variant={lawyerProfile.status === 'approved' ? 'success' : lawyerProfile.status === 'pending' ? 'warning' : 'danger'}
                size="lg"
              >
                {LAWYER_STATUSES[lawyerProfile.status]?.label || lawyerProfile.status}
              </TMLBadge>
            </div>
          )}

          {/* Success/Error Messages */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-xl"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{success}</span>
            </motion.div>
          )}
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-[#7e277e] text-white shadow-lg shadow-[#7e277e]/20'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
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
                    value={profileForm.firm_name}
                    onChange={(e) => setProfileForm({ ...profileForm, firm_name: e.target.value })}
                    required
                  />
                  <TMLInput
                    label="Bar Number"
                    value={profileForm.bar_number}
                    onChange={(e) => setProfileForm({ ...profileForm, bar_number: e.target.value })}
                  />
                </div>
                
                <TMLInput
                  label="Phone Number"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  required
                />
                
                <TMLTextarea
                  label="Professional Bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={4}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    States Licensed
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {US_STATES.map((state) => (
                      <label key={state} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <Checkbox
                          checked={profileForm.states_licensed.includes(state)}
                          onCheckedChange={() => toggleArrayItem('states_licensed', state)}
                        />
                        <span className="text-sm text-gray-700">{state}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practice Areas
                  </label>
                  <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-4">
                    {PRACTICE_AREAS.map((area) => (
                      <label key={area} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <Checkbox
                          checked={profileForm.practice_areas.includes(area)}
                          onCheckedChange={() => toggleArrayItem('practice_areas', area)}
                        />
                        <span className="text-sm text-gray-700">{area}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <TMLButton 
                    variant="primary" 
                    onClick={handleSaveProfile}
                    loading={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </TMLButton>
                </div>
              </TMLCardContent>
            </TMLCard>
          )}

          {activeTab === 'agreement' && (
            <TMLCard variant="elevated">
              <TMLCardHeader>
                <TMLCardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#7e277e]" />
                  Referral Agreement
                </TMLCardTitle>
              </TMLCardHeader>
              <TMLCardContent>
                {lawyerProfile?.referral_agreement_accepted ? (
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
                  </div>
                ) : (
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
                    
                    <TMLButton 
                      variant="primary" 
                      onClick={handleAcceptAgreement}
                      loading={saving}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      I Accept the Referral Agreement
                    </TMLButton>
                  </div>
                )}
              </TMLCardContent>
            </TMLCard>
          )}

          {activeTab === 'billing' && (
            <TMLCard variant="elevated">
              <TMLCardHeader>
                <TMLCardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#7e277e]" />
                  Billing & Subscription
                </TMLCardTitle>
              </TMLCardHeader>
              <TMLCardContent>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Membership Status</h3>
                        <p className="text-gray-600">
                          {lawyerProfile?.subscription_status === 'active' 
                            ? 'Your membership is active'
                            : lawyerProfile?.subscription_status === 'trial'
                            ? 'You are in your free trial period'
                            : 'Billing starts after approval'}
                        </p>
                      </div>
                      <TMLBadge 
                        variant={lawyerProfile?.subscription_status === 'active' ? 'success' : 'warning'}
                        size="lg"
                      >
                        {lawyerProfile?.subscription_status === 'active' ? 'Active' : 
                         lawyerProfile?.subscription_status === 'trial' ? 'Trial' : 'Pending'}
                      </TMLBadge>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <p className="text-sm text-gray-600 mb-2">Membership Price</p>
                      <p className="text-3xl font-bold text-gray-900">
                        $50<span className="text-lg font-normal text-gray-500">/month</span>
                      </p>
                    </div>
                    
                    {lawyerProfile?.free_trial_months > 0 && (
                      <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                        <CheckCircle2 className="w-4 h-4 inline mr-2" />
                        You have {lawyerProfile.free_trial_months} months free trial!
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>
                      Payment method will be collected during approval process. 
                      Billing begins after your application is approved and any trial period ends.
                    </p>
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>
          )}
        </div>
      </main>
    </div>
  );
}