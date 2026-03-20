import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Scale, 
  MapPin, 
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  FileText,
  User,
  Loader2
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import UpgradeModal from '@/components/membership/UpgradeModal';
import { Crown } from 'lucide-react';

export default function CaseDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

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
  const { data: profiles, isLoading: profileLoading } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles?.[0] || null;
  const profileLoaded = !profileLoading && profiles !== undefined;

  // Use unified user_status if available (new identity system), fall back to LawyerProfile legacy
  const userStatusApproved = user?.user_status === 'approved';
  const profileStatusApproved = lawyerProfile?.status === 'approved';
  const isApproved = profileLoaded && (userStatusApproved || user?.user_status === 'active' || profileStatusApproved);
  const isPending = profileLoaded && !isApproved;

  // Redirect pending lawyers — only once profile is loaded
  useEffect(() => {
    if (!loading && profileLoaded && isPending) {
      navigate(createPageUrl('CaseExchange') + '?blocked=1', { replace: true });
    }
  }, [loading, profileLoaded, isPending]);

  // Get case — only for approved lawyers
  const { data: caseItem, isLoading: caseLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const cases = await base44.entities.Case.filter({ id: caseId });
      return cases[0] || null;
    },
    enabled: !!caseId && !!user && profileLoaded && isApproved,
  });

  const handleAcceptCase = async () => {
    if (!caseItem || !user) return;

    // Validation: check approval via user_status OR lawyerProfile (legacy)
    const approvedViaUserStatus = user?.user_status === 'approved';
    const approvedViaProfile = lawyerProfile?.status === 'approved';
    if (!approvedViaUserStatus && !approvedViaProfile) {
      setError('Your application must be approved before accepting cases.');
      return;
    }

    // Referral agreement check — only enforce if lawyerProfile exists
    if (lawyerProfile && !lawyerProfile.referral_agreement_accepted) {
      setError('Please accept the referral agreement before accepting cases.');
      return;
    }
    
    if (caseItem.status !== 'published') {
      setError('This case is no longer available.');
      return;
    }
    
    setAccepting(true);
    setError(null);
    
    try {
      // Accept case via backend function (bypasses RLS)
      await base44.functions.invoke('acceptCase', { caseId });
      
      // Send confirmation email via backend function
      try {
        await base44.functions.invoke('sendApplicationEmails', {
          to: user.email,
          from_name: 'Taylor Made Law',
          subject: `Case Accepted — ${caseItem.title}`,
          body: `
            <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f4f1ee;">
              <div style="text-align:center;margin-bottom:24px;">
                <img src="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png" alt="Taylor Made Law" style="height:50px;" />
              </div>
              <div style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Case Accepted!</h1>
                <p style="color:#6b7280;margin:0 0 24px;">You have successfully accepted a new case referral.</p>
                <div style="background:#f5f0fa;border-radius:10px;padding:18px;margin-bottom:24px;">
                  <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
                    <tr><td style="padding:5px 0;color:#6b7280;width:40%;">Case</td><td style="padding:5px 0;font-weight:600;">${caseItem.title}</td></tr>
                    <tr><td style="padding:5px 0;color:#6b7280;">Practice Area</td><td style="padding:5px 0;font-weight:600;">${caseItem.practice_area}</td></tr>
                    <tr><td style="padding:5px 0;color:#6b7280;">State</td><td style="padding:5px 0;font-weight:600;">${caseItem.state}</td></tr>
                    ${caseItem.estimated_value ? `<tr><td style="padding:5px 0;color:#6b7280;">Est. Value</td><td style="padding:5px 0;font-weight:600;color:#059669;">$${caseItem.estimated_value.toLocaleString()}</td></tr>` : ''}
                  </table>
                </div>
                <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 12px;">Next steps:</p>
                <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
                  <li>Review full case details in your dashboard</li>
                  <li>Contact the client within 24–48 hours</li>
                  <li>Document all communications for compliance</li>
                </ul>
                <p style="color:#6b7280;font-size:13px;margin:0;">Questions? <a href="mailto:support@taylormadelaw.com" style="color:#3a164d;">support@taylormadelaw.com</a></p>
              </div>
              <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">© ${new Date().getFullYear()} Taylor Made Law. All rights reserved.</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.log('Case acceptance email attempted');
      }
      
      queryClient.invalidateQueries(['case', caseId]);
      navigate(createPageUrl('MyCases'));
    } catch (err) {
      console.error('Error accepting case:', err);
      setError('An error occurred while accepting the case. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || profileLoading || caseLoading || (profileLoaded && isPending)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppSidebar user={user} lawyerProfile={lawyerProfile} />
        <main className="ml-64 p-8">
          <div className="max-w-4xl mx-auto text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Not Found</h2>
            <p className="text-gray-600 mb-6">The case you're looking for doesn't exist or has been removed.</p>
            <Link to={createPageUrl('CaseExchange')}>
              <TMLButton variant="primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Case Exchange
              </TMLButton>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isAvailable = caseItem.status === 'published';
  const userApproved = user?.user_status === 'approved' || lawyerProfile?.status === 'approved';
  const agreementOk = !lawyerProfile || lawyerProfile.referral_agreement_accepted;
  const isPaidMember = user?.membership_status === 'paid';
  const canAccept = userApproved && agreementOk && isAvailable && isPaidMember;

  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    navigate(createPageUrl('LawyerSettings') + '?tab=billing');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to={createPageUrl('CaseExchange')} className="inline-flex items-center text-gray-600 hover:text-[#7e277e] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Case Exchange
          </Link>

          {/* Case Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TMLCard variant="elevated" className="mb-6">
              <TMLCardContent className="p-8">
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {caseItem.is_trending && (
                        <TMLBadge variant="trending">
                          <TrendingUp className="w-3 h-3 mr-1" /> Trending
                        </TMLBadge>
                      )}
                      <TMLBadge variant={isAvailable ? 'success' : 'default'}>
                        {isAvailable ? 'Available' : caseItem.status === 'accepted' ? 'Accepted' : 'Not Available'}
                      </TMLBadge>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">{caseItem.title}</h1>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Scale className="w-5 h-5" />
                        <span>{caseItem.practice_area}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-5 h-5" />
                        <span>{caseItem.state}</span>
                      </div>
                    </div>
                  </div>
                  
                  {caseItem.estimated_value && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Estimated Value</p>
                      <p className="text-4xl font-bold text-emerald-600">
                        ${caseItem.estimated_value.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl mb-6">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Accept Button */}
                {isAvailable && (
                  <div className="flex items-center gap-4">
                    <TMLButton 
                      variant="primary" 
                      size="lg"
                      onClick={handleAcceptCase}
                      loading={accepting}
                      disabled={!canAccept}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Accept This Case
                    </TMLButton>
                    
                    {!canAccept && lawyerProfile && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">
                          {lawyerProfile.status !== 'approved' 
                            ? 'Approval required to accept cases'
                            : 'Accept referral agreement first'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {!isAvailable && caseItem.status === 'accepted' && (
                  <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>This case has been accepted by an attorney.</span>
                  </div>
                )}
              </TMLCardContent>
            </TMLCard>
          </motion.div>

          {/* Case Details */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <TMLCard>
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#7e277e]" />
                    Case Description
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {caseItem.description || 'No description provided.'}
                  </p>
                </TMLCardContent>
              </TMLCard>

              {/* Key Facts */}
              {caseItem.key_facts && caseItem.key_facts.length > 0 && (
                <TMLCard>
                  <TMLCardHeader>
                    <TMLCardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#7e277e]" />
                      Key Facts
                    </TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent>
                    <ul className="space-y-3">
                      {caseItem.key_facts.map((fact, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                          <span className="text-gray-700">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </TMLCardContent>
                </TMLCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Case Info */}
              <TMLCard variant="cream">
                <TMLCardHeader>
                  <TMLCardTitle>Case Information</TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Practice Area</p>
                    <p className="font-medium text-gray-900">{caseItem.practice_area}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">State</p>
                    <p className="font-medium text-gray-900">{caseItem.state}</p>
                  </div>
                  {caseItem.estimated_value && (
                    <div>
                      <p className="text-sm text-gray-500">Estimated Value</p>
                      <p className="font-medium text-emerald-600">${caseItem.estimated_value.toLocaleString()}</p>
                    </div>
                  )}
                  {caseItem.published_at && (
                    <div>
                      <p className="text-sm text-gray-500">Published</p>
                      <p className="font-medium text-gray-900">
                        {new Date(caseItem.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </TMLCardContent>
              </TMLCard>

              {/* Compliance Notice */}
              <TMLCard className="border-l-4 border-l-[#7e277e]">
                <TMLCardContent>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#7e277e] mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Referral Compliance</p>
                      <p className="text-sm text-gray-600">
                        By accepting this case, you agree to the Taylor Made Law referral agreement and applicable fee arrangement.
                      </p>
                    </div>
                  </div>
                </TMLCardContent>
              </TMLCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}