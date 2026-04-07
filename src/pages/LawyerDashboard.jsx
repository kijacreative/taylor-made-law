import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { me as getMe, logout, getProfile } from '@/services/auth';
import { isAuthenticated } from '@/services/auth';
import { getCasesForLawyer, filterCases } from '@/services/cases';
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
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

export default function LawyerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const userData = await getMe();
    if (userData.user_status === 'disabled') {
      await logout();
      navigate('/login');
      return;
    }
    setUser(userData);
    return userData;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await isAuthenticated();
        if (!isAuth) {
          navigate('/login');
          return;
        }
        const userData = await refreshUser();
        if (!userData) return;
        
        if (userData.role === 'admin') {
          navigate('/AdminDashboard');
          return;
        }
      } catch (e) {
        navigate('/login');
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
    queryFn: () => getProfile(user.id).then(p => p ? [p] : []),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles[0] || null;

  // Use server-enforced endpoint — teaser-safe for pending lawyers
  const { data: caseData } = useQuery({
    queryKey: ['casesForLawyer', user?.id],
    queryFn: async () => {
      const res = await getCasesForLawyer();
      // Service may return { data: { cases, stats } } (Base44) or { cases, stats } (Supabase)
      return res?.data || res;
    },
    enabled: !!user,
  });

  const availableCases = caseData?.cases || [];
  const caseStats = caseData?.stats || { total: 0, byState: {}, byPracticeArea: {} };

  // Get my cases
  const { data: myCases = [] } = useQuery({
    queryKey: ['myCases', user?.email],
    queryFn: () => filterCases({ accepted_by_email: user.email }),
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

  // Onboarding gate — if profile not complete, send to onboarding
  const onboardingComplete = !!user?.profile_completed_at;
  if (!onboardingComplete) {
    navigate('/app/onboarding', { replace: true });
    return null;
  }

  // Determine approval status — check user_status first, then fall back to lawyerProfile.status
  const pendingUserStatuses = ['active_pending_review', 'pending', 'invited'];
  const approvedUserStatuses = ['approved', 'active'];

  const isPending = pendingUserStatuses.includes(user?.user_status) ||
    (!approvedUserStatuses.includes(user?.user_status) && lawyerProfile?.status === 'pending');
  const isApproved = approvedUserStatuses.includes(user?.user_status) || lawyerProfile?.status === 'approved';
  const needsReferralAgreement = isApproved && !lawyerProfile?.referral_agreement_accepted;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      <PopupModal user={user} lawyerProfile={lawyerProfile} placement="dashboard" />
      
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            {lawyerProfile?.profile_photo_url ? (
              <img
                src={lawyerProfile.profile_photo_url}
                alt={lawyerProfile.full_name || 'Profile'}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#3a164d]/20 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#3a164d] flex items-center justify-center text-white font-bold text-xl shrink-0">
                {(lawyerProfile?.full_name || user?.full_name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome{lawyerProfile?.full_name ? `, ${lawyerProfile.full_name}` : user?.full_name ? `, ${user.full_name}` : ''}
              </h1>
              <p className="text-gray-600 mt-1">Here's what's happening with your cases today.</p>
            </div>
          </div>

          {/* Status Banners */}
          {isPending && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-4">
                <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 text-base">Your application is pending approval.</h3>
                  <p className="text-amber-700 text-sm mt-1">
                    A Taylor Made Law admin will review and approve your application within <strong>24–48 hours</strong>. Until then, you cannot accept cases or create circles. You can explore the platform and complete your profile in the meantime.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Complete Profile Banner — shown to all users until profile is complete */}
          {!lawyerProfile?.bio && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
              <div className="bg-[#f5f0fa] border-2 border-[#3a164d]/20 rounded-2xl p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-[#3a164d]/10 rounded-xl shrink-0">
                    <AlertCircle className="w-5 h-5 text-[#3a164d]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3a164d] text-base">Your attorney profile is incomplete.</h3>
                    <p className="text-[#3a164d]/70 text-sm mt-1">
                      Add your bio, practice areas, and contact details so clients and the Taylor Made Law team can learn more about you.
                    </p>
                  </div>
                </div>
                <Link to={createPageUrl('LawyerSettings')} className="shrink-0">
                  <TMLButton variant="primary" size="sm">Complete Profile →</TMLButton>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Getting Started Checklist for approved users */}
          {isApproved && !lawyerProfile?.referral_agreement_accepted && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-emerald-100 rounded-xl shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">Accept the Referral Agreement to start accepting cases.</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Your account is approved! Review and accept the referral agreement to unlock full case access.
                    </p>
                  </div>
                </div>
                <Link to={createPageUrl('LawyerSettings')} className="shrink-0">
                  <TMLButton variant="accent" size="sm">Review & Accept →</TMLButton>
                </Link>
              </div>
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