import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Scale, 
  FolderOpen, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  CreditCard,
  Loader2
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import PopupModal from '@/components/popups/PopupModal';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import { CASE_STATUSES } from '@/components/design/DesignTokens';

export default function LawyerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const userData = await base44.auth.me();
    if (userData.user_status === 'disabled') {
      await base44.auth.logout();
      navigate(createPageUrl('LawyerLogin') + '?disabled=1');
      return;
    }
    setUser(userData);
    return userData;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate(createPageUrl('LawyerLogin'));
          return;
        }
        const userData = await refreshUser();
        if (!userData) return;
        
        if (userData.role === 'admin') {
          navigate(createPageUrl('AdminDashboard'));
          return;
        }
      } catch (e) {
        navigate(createPageUrl('Home'));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // Poll for status changes while pending (every 30 seconds)
  useEffect(() => {
    if (!user || user.user_status === 'approved' || user.role === 'admin') return;
    const interval = setInterval(async () => {
      try {
        await refreshUser();
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.user_status]);

  // Get lawyer profile
  const { data: profiles = [] } = useQuery({
    queryKey: ['lawyerProfile', user?.email],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles[0] || null;

  // Use server-enforced endpoint — teaser-safe for pending lawyers
  const { data: caseData } = useQuery({
    queryKey: ['casesForLawyer', user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCasesForLawyer', {});
      return res.data;
    },
    enabled: !!user,
  });

  const availableCases = caseData?.cases || [];
  const caseStats = caseData?.stats || { total: 0, byState: {}, byPracticeArea: {} };

  // Get my cases
  const { data: myCases = [] } = useQuery({
    queryKey: ['myCases', user?.email],
    queryFn: () => base44.entities.Case.filter({ accepted_by_email: user.email }),
    enabled: !!user?.email,
  });

  // Trending cases — only title/state/practice_area exposed even for pending
  const trendingCases = availableCases.filter(c => c.is_trending).slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  // Onboarding gate — redirect to onboarding if not yet complete (new flow)
  const isNewFlowUser = user?.user_status === 'active_pending_review' || user?.user_status === 'active';
  const onboardingComplete = !!user?.profile_completed_at;
  if (isNewFlowUser && !onboardingComplete) {
    navigate(createPageUrl('LawyerOnboarding'), { replace: true });
    return null;
  }

  // Use unified user_status on the user record, fall back to lawyerProfile for legacy
  const isPending = user?.user_status === 'pending' || user?.user_status === 'invited' || user?.user_status === 'active_pending_review' || (!user?.user_status && (!lawyerProfile || lawyerProfile.status === 'pending'));
  const isApproved = user?.user_status === 'approved' || user?.user_status === 'active' || (!user?.user_status && lawyerProfile?.status === 'approved');
  const needsReferralAgreement = isApproved && !lawyerProfile?.referral_agreement_accepted;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      <PopupModal user={user} lawyerProfile={lawyerProfile} placement="dashboard" />
      
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
          Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your cases today.</p>
          </div>

          {/* Status Banners */}
          {isPending && (
          <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
          >
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-base">Pending Approval — You can explore the platform, but full case details unlock after approval.</h3>
              <p className="text-amber-700 text-sm mt-1">
                Our team typically reviews applications within 2–3 business days. In the meantime, you can browse blog posts, mass torts, and see a preview of the case marketplace below.
              </p>
            </div>
          </div>
          </motion.div>
          )}

          {/* Getting Started Checklist for new auto-approved users */}
          {isApproved && (!lawyerProfile?.referral_agreement_accepted || !user?.profile_completed_at) && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <TMLCard className="border-l-4 border-l-[#3a164d] bg-[#f5f0fa]">
                <div className="p-2">
                  <h3 className="font-bold text-[#3a164d] text-lg mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Getting Started Checklist
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">Complete these steps to unlock full case access.</p>
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${lawyerProfile?.referral_agreement_accepted ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-amber-200'}`}>
                      {lawyerProfile?.referral_agreement_accepted
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        : <div className="w-5 h-5 rounded-full border-2 border-amber-400 shrink-0" />}
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${lawyerProfile?.referral_agreement_accepted ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>
                          Accept the Referral Agreement
                        </p>
                        <p className="text-xs text-gray-500">Required before accepting any cases</p>
                      </div>
                      {!lawyerProfile?.referral_agreement_accepted && (
                        <Link to={createPageUrl('LawyerSettings')}>
                          <TMLButton variant="accent" size="sm">Review & Accept →</TMLButton>
                        </Link>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${user?.profile_completed_at ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-amber-200'}`}>
                      {user?.profile_completed_at
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        : <div className="w-5 h-5 rounded-full border-2 border-amber-400 shrink-0" />}
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${user?.profile_completed_at ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>
                          Complete Your Attorney Profile
                        </p>
                        <p className="text-xs text-gray-500">Add your bio and professional details</p>
                      </div>
                      {!user?.profile_completed_at && (
                        <Link to={createPageUrl('LawyerSettings')}>
                          <TMLButton variant="accent" size="sm">Complete Profile →</TMLButton>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </TMLCard>
            </motion.div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Available Cases</p>
                    <p className="text-3xl font-bold text-gray-900">{caseStats.total}</p>
                    {isPending && <p className="text-xs text-amber-600 mt-0.5">Preview only</p>}
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Scale className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <Link to={createPageUrl('CaseExchange')} className="text-[#3a164d] text-sm font-medium mt-4 flex items-center gap-1 hover:underline">
                  {isPending ? 'Preview Marketplace' : 'Browse Cases'} <ArrowRight className="w-4 h-4" />
                </Link>
              </TMLCardContent>
            </TMLCard>

            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">My Active Cases</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {myCases.filter(c => ['accepted', 'in_progress'].includes(c.status)).length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FolderOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <Link to={createPageUrl('MyCases')} className="text-[#3a164d] text-sm font-medium mt-4 flex items-center gap-1 hover:underline">
                  View My Cases <ArrowRight className="w-4 h-4" />
                </Link>
              </TMLCardContent>
            </TMLCard>

            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Membership Status</p>
                    <p className="text-xl font-bold text-gray-900">
                      {(user?.user_status === 'approved' || lawyerProfile?.status === 'approved') ? 'Active' : 
                       (user?.user_status === 'pending' || lawyerProfile?.status === 'pending') ? 'Pending' : 'Inactive'}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <Link to={createPageUrl('LawyerSettings')} className="text-[#3a164d] text-sm font-medium mt-4 flex items-center gap-1 hover:underline">
                  Manage Subscription <ArrowRight className="w-4 h-4" />
                </Link>
              </TMLCardContent>
            </TMLCard>
          </div>

          {/* Trending Cases */}
          {trendingCases.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#3a164d]" />
                  <h2 className="text-xl font-bold text-gray-900">Trending Cases</h2>
                  {isPending && <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Preview</span>}
                </div>
                <Link to={createPageUrl('CaseExchange')} className="text-[#3a164d] text-sm font-medium hover:underline">
                  View All
                </Link>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                {trendingCases.map((caseItem) => (
                  isPending ? (
                    <TMLCard key={caseItem.id} className="h-full opacity-90">
                      <TMLCardContent>
                        <div className="flex items-start justify-between mb-3">
                          <TMLBadge variant="trending" size="sm">
                            <TrendingUp className="w-3 h-3 mr-1" /> Trending
                          </TMLBadge>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{caseItem.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <TMLBadge variant="primary" size="sm">{caseItem.practice_area}</TMLBadge>
                          <TMLBadge variant="default" size="sm">{caseItem.state}</TMLBadge>
                        </div>
                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                          <Shield className="w-3 h-3" /> Details unlock after approval
                        </p>
                      </TMLCardContent>
                    </TMLCard>
                  ) : (
                    <Link key={caseItem.id} to={`${createPageUrl('CaseDetail')}?id=${caseItem.id}`}>
                      <TMLCard hover className="h-full">
                        <TMLCardContent>
                          <div className="flex items-start justify-between mb-3">
                            <TMLBadge variant="trending" size="sm">
                              <TrendingUp className="w-3 h-3 mr-1" /> Trending
                            </TMLBadge>
                            {caseItem.estimated_value && (
                              <span className="text-sm font-semibold text-emerald-600">
                                ${caseItem.estimated_value.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{caseItem.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            <TMLBadge variant="primary" size="sm">{caseItem.practice_area}</TMLBadge>
                            <TMLBadge variant="default" size="sm">{caseItem.state}</TMLBadge>
                          </div>
                        </TMLCardContent>
                      </TMLCard>
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Recent Cases */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">Recent Available Cases</h2>
                {isPending && <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Preview Only</span>}
              </div>
              <Link to={createPageUrl('CaseExchange')} className="text-[#3a164d] text-sm font-medium hover:underline">
                View All
              </Link>
            </div>
            
            {availableCases.length === 0 ? (
              <TMLCard variant="cream" className="text-center py-12">
                <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cases Available</h3>
                <p className="text-gray-600">Check back soon for new case opportunities.</p>
              </TMLCard>
            ) : (
              <div className="space-y-4">
                {availableCases.slice(0, 5).map((caseItem) => (
                  isPending ? (
                    <TMLCard key={caseItem.id} className="flex items-center justify-between opacity-90">
                      <TMLCardContent className="flex items-center gap-4 w-full py-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{caseItem.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <TMLBadge variant="primary" size="sm">{caseItem.practice_area}</TMLBadge>
                            <TMLBadge variant="default" size="sm">{caseItem.state}</TMLBadge>
                            {caseItem.is_trending && <TMLBadge variant="trending" size="sm">Trending</TMLBadge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-600 text-sm font-medium">
                          <Shield className="w-4 h-4" /> Locked
                        </div>
                      </TMLCardContent>
                    </TMLCard>
                  ) : (
                    <Link key={caseItem.id} to={`${createPageUrl('CaseDetail')}?id=${caseItem.id}`}>
                      <TMLCard hover className="flex items-center justify-between">
                        <TMLCardContent className="flex items-center gap-4 w-full py-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{caseItem.title}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <TMLBadge variant="primary" size="sm">{caseItem.practice_area}</TMLBadge>
                              <TMLBadge variant="default" size="sm">{caseItem.state}</TMLBadge>
                              {caseItem.is_trending && <TMLBadge variant="trending" size="sm">Trending</TMLBadge>}
                            </div>
                          </div>
                          {caseItem.estimated_value && (
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Est. Value</p>
                              <p className="font-semibold text-emerald-600">${caseItem.estimated_value.toLocaleString()}</p>
                            </div>
                          )}
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </TMLCardContent>
                      </TMLCard>
                    </Link>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}