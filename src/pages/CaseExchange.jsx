import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser, getProfile } from '@/services/auth';
import { getCasesForLawyer } from '@/services/cases';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Scale,
  MapPin,
  TrendingUp,
  ArrowRight,
  Loader2,
  X,
  Lock,
  Clock,
  Plus,
  Crown,
  DollarSign,
  Calendar,
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import SubmitCaseModal from '@/components/cases/SubmitCaseModal';
import UpgradeModal from '@/components/membership/UpgradeModal';
import CategoryFilter from '@/components/cases/CategoryFilter';
import { format } from 'date-fns';

export default function CaseExchange() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [lawyerProfile, setLawyerProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) { navigate(createPageUrl('LawyerLogin')); return; }
        if (userData.role === 'admin') { navigate(createPageUrl('AdminDashboard')); return; }
        setUser(userData);
        setLawyerProfile(await getProfile(userData.id));
      } catch { navigate(createPageUrl('Home')); }
      finally { setAuthLoading(false); }
    };
    checkAuth();
  }, []);

  const isApproved = user?.user_status === 'approved' || user?.user_status === 'active' || lawyerProfile?.status === 'approved';
  const isPending = !isApproved;
  const isPaidMember = user?.membership_status === 'paid';

  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    navigate(createPageUrl('LawyerSettings') + '?tab=billing');
  };

  const { data: caseData, isLoading: casesLoading } = useQuery({
    queryKey: ['casesForLawyer', user?.id],
    queryFn: async () => {
      const res = await getCasesForLawyer();
      return res.data;
    },
    enabled: !!user,
  });

  const cases = caseData?.cases || [];

  const filteredCases = cases.filter(c => {
    // Category filter
    if (activeCategory) {
      const pa = (c.practice_area || '').toLowerCase();
      if (!pa.includes(activeCategory.toLowerCase())) return false;
    }
    // Search filter
    if (search) {
      const s = search.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(s);
      const matchDesc = c.description?.toLowerCase().includes(s);
      const matchArea = c.practice_area?.toLowerCase().includes(s);
      const matchState = c.state?.toLowerCase().includes(s);
      if (!matchTitle && !matchDesc && !matchArea && !matchState) return false;
    }
    return true;
  });

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Case Exchange</h1>
              <p className="text-gray-500 mt-1">Browse, filter, and connect with cases across the network.</p>
            </div>
            <div className="flex items-center gap-3">
              {isApproved && isPaidMember && (
                <TMLButton variant="primary" onClick={() => setShowSubmitModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit a Case
                </TMLButton>
              )}
              {isApproved && !isPaidMember && (
                <TMLButton variant="outline" onClick={() => setShowUpgradeModal(true)}>
                  <Lock className="w-4 h-4 mr-2" />
                  Post a Case
                </TMLButton>
              )}
            </div>
          </div>

          {showSubmitModal && (
            <SubmitCaseModal user={user} onClose={() => setShowSubmitModal(false)} />
          )}
          {showUpgradeModal && (
            <UpgradeModal onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} />
          )}

          {/* Upgrade Banner */}
          {isApproved && !isPaidMember && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="bg-gradient-to-r from-[#3a164d]/5 to-[#a47864]/5 border border-[#3a164d]/20 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-2.5 bg-[#3a164d]/10 rounded-xl shrink-0">
                  <Crown className="w-5 h-5 text-[#3a164d]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#3a164d] text-base">Upgrade to unlock full Case Exchange access</h3>
                  <p className="text-gray-600 text-sm mt-0.5">Accept cases, post referrals, and access private circle case discussions — all for $50/month.</p>
                </div>
                <TMLButton variant="primary" size="sm" onClick={() => setShowUpgradeModal(true)}>
                  Upgrade — $50/mo
                </TMLButton>
              </div>
            </motion.div>
          )}

          {/* Pending Banner */}
          {isPending && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 text-base">Pending Approval — Limited Access</h3>
                  <p className="text-amber-700 text-sm mt-1">Full case details unlock once your account is approved. Our team typically reviews within 2–3 business days.</p>
                </div>
              </div>
            </motion.div>
          )}

          {casesLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
            </div>
          ) : (
            <>
              {/* Category Filter */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                <CategoryFilter
                  activeCategory={activeCategory}
                  cases={cases}
                  onSelect={setActiveCategory}
                />
              </div>

              {/* Search Bar */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search cases by keyword, location, or type…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d] text-sm"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-800">{filteredCases.length}</span> {isPending ? 'previews' : 'cases'}
                  {activeCategory && <span> in <span className="font-semibold text-[#3a164d]">{activeCategory}</span></span>}
                </p>
                {(activeCategory || search) && (
                  <button onClick={() => { setActiveCategory(''); setSearch(''); }} className="text-sm text-[#3a164d] hover:underline flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Clear filters
                  </button>
                )}
              </div>

              {/* Case List */}
              {filteredCases.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 px-6">
                  <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">No cases found</h3>
                  <p className="text-gray-500 text-sm mb-4">No cases found for this category or search.</p>
                  <TMLButton variant="outline" size="sm" onClick={() => { setActiveCategory(''); setSearch(''); }}>
                    Clear filters
                  </TMLButton>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCases.map((caseItem, index) => (
                    <motion.div
                      key={caseItem.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      {isPending ? (
                        <PendingCaseCard caseItem={caseItem} />
                      ) : (
                        <ActiveCaseCard
                          caseItem={caseItem}
                          isPaidMember={isPaidMember}
                          onUpgrade={() => setShowUpgradeModal(true)}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function PendingCaseCard({ caseItem }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {caseItem.is_trending && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full border border-orange-200">
                <TrendingUp className="w-3 h-3" /> Trending
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
              <Lock className="w-3 h-3" /> Details available upon approval
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5 text-[#3a164d]" />{caseItem.practice_area}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#3a164d]" />{caseItem.state}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 text-gray-300">
          <Lock className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ActiveCaseCard({ caseItem, isPaidMember, onUpgrade }) {
  const isHighValue = caseItem.estimated_value && caseItem.estimated_value >= 100000;
  const isNew = caseItem.published_at && (Date.now() - new Date(caseItem.published_at).getTime()) < 3 * 24 * 60 * 60 * 1000;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#3a164d]/20 transition-all duration-200 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              Available
            </span>
            {isNew && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-200">
                New
              </span>
            )}
            {isHighValue && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                High Value
              </span>
            )}
            {caseItem.is_trending && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full border border-orange-200">
                <TrendingUp className="w-3 h-3" /> Trending
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-1.5">{caseItem.title}</h3>

          {caseItem.description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">{caseItem.description}</p>
          )}

          {/* Key details */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[#3a164d]" />
              {caseItem.practice_area}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#3a164d]" />
              {caseItem.state}
            </span>
            {caseItem.published_at && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {format(new Date(caseItem.published_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="shrink-0 flex flex-col items-end gap-3 min-w-[120px]">
          {caseItem.estimated_value && (
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Est. Value</p>
              <p className="text-xl font-bold text-emerald-600">${caseItem.estimated_value.toLocaleString()}</p>
            </div>
          )}
          {isPaidMember ? (
            <Link to={`${createPageUrl('CaseDetail')}?id=${caseItem.id}`}>
              <TMLButton variant="primary" size="sm">
                View Case <ArrowRight className="w-4 h-4 ml-1" />
              </TMLButton>
            </Link>
          ) : (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[#3a164d]/10 text-[#3a164d] hover:bg-[#3a164d]/20 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> Upgrade to Accept
            </button>
          )}
        </div>
      </div>
    </div>
  );
}