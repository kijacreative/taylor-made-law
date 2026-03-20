import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Scale,
  MapPin,
  TrendingUp,
  ArrowRight,
  Loader2,
  X,
  Lock,
  Clock,
  BarChart3,
  Plus,
  Crown,
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLSelect from '@/components/ui/TMLSelect';
import TMLInput from '@/components/ui/TMLInput';
import { PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';
import SubmitCaseModal from '@/components/cases/SubmitCaseModal';
import UpgradeModal from '@/components/membership/UpgradeModal';

export default function CaseExchange() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [lawyerProfile, setLawyerProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    state: '',
    practice_area: '',
    value_min: '',
    value_max: '',
    trending_only: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('LawyerLogin')); return; }
        const userData = await base44.auth.me();
        if (userData.role === 'admin') { navigate(createPageUrl('AdminDashboard')); return; }
        setUser(userData);
        const profiles = await base44.entities.LawyerProfile.filter({ user_id: userData.id });
        setLawyerProfile(profiles[0] || null);
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

  // Server-side enforced case fetch
  const { data: caseData, isLoading: casesLoading } = useQuery({
    queryKey: ['casesForLawyer', user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCasesForLawyer', {});
      return res.data;
    },
    enabled: !!user,
  });

  const cases = caseData?.cases || [];
  const stats = caseData?.stats || { total: 0, byState: {}, byPracticeArea: {} };

  const filteredCases = cases.filter(c => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!c.title?.toLowerCase().includes(s) && !c.practice_area?.toLowerCase().includes(s)) return false;
    }
    if (filters.state && c.state !== filters.state) return false;
    if (filters.practice_area && c.practice_area !== filters.practice_area) return false;
    if (filters.trending_only && !c.is_trending) return false;
    // value filters only for approved (pending don't have estimated_value)
    if (!isPending) {
      if (filters.value_min && c.estimated_value < parseInt(filters.value_min)) return false;
      if (filters.value_max && c.estimated_value > parseInt(filters.value_max)) return false;
    }
    return true;
  });

  const hasActiveFilters = filters.state || filters.practice_area || filters.value_min || filters.value_max || filters.trending_only;
  const clearFilters = () => setFilters({ search: '', state: '', practice_area: '', value_min: '', value_max: '', trending_only: false });

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Case Exchange</h1>
              <p className="text-gray-600 mt-1">
                {isApproved ? 'Browse and accept verified case referrals.' : 'Preview the marketplace — full access unlocks upon approval.'}
              </p>
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

          {/* Free Member Banner */}
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
                  <p className="text-amber-700 text-sm mt-1">
                    You can see marketplace statistics and case previews below. Full case details, descriptions, client information, and the ability to accept cases unlock once your account is approved. Our team typically reviews applications within 2–3 business days.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Marketplace Stats — always shown */}
          {casesLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Available Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-400 mt-1">Updated live</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Top States</p>
                  <div className="space-y-1">
                    {Object.entries(stats.byState).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([state, count]) => (
                      <div key={state} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{state}</span>
                        <span className="text-sm font-semibold text-[#3a164d]">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Top Practice Areas</p>
                  <div className="space-y-1">
                    {Object.entries(stats.byPracticeArea).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([area, count]) => (
                      <div key={area} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 truncate mr-2">{area}</span>
                        <span className="text-sm font-semibold text-[#3a164d] shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search + Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by title or practice area..."
                      value={filters.search}
                      onChange={e => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                    />
                  </div>
                  <TMLButton
                    variant={showFilters ? 'primary' : 'outline'}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {hasActiveFilters && <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">Active</span>}
                  </TMLButton>
                </div>

                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <TMLSelect
                        label="State"
                        placeholder="All States"
                        options={[{ value: '', label: 'All States' }, ...US_STATES.map(s => ({ value: s, label: s }))]}
                        value={filters.state}
                        onChange={e => setFilters({ ...filters, state: e.target.value })}
                      />
                      <TMLSelect
                        label="Practice Area"
                        placeholder="All Practice Areas"
                        options={[{ value: '', label: 'All Practice Areas' }, ...PRACTICE_AREAS.map(p => ({ value: p, label: p }))]}
                        value={filters.practice_area}
                        onChange={e => setFilters({ ...filters, practice_area: e.target.value })}
                      />
                      {isApproved && (
                        <>
                          <TMLInput label="Min Value" type="number" placeholder="$0" value={filters.value_min} onChange={e => setFilters({ ...filters, value_min: e.target.value })} />
                          <TMLInput label="Max Value" type="number" placeholder="No max" value={filters.value_max} onChange={e => setFilters({ ...filters, value_max: e.target.value })} />
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.trending_only}
                          onChange={e => setFilters({ ...filters, trending_only: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-[#3a164d]"
                        />
                        <span className="text-sm text-gray-700">Trending cases only</span>
                      </label>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-sm text-[#3a164d] hover:underline flex items-center gap-1">
                          <X className="w-4 h-4" /> Clear filters
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600">
                  Showing <span className="font-semibold">{filteredCases.length}</span> {isPending ? 'previews' : 'cases'}
                </p>
              </div>

              {/* Case List */}
              {isPending ? (
                /* TEASER MODE — real data but no sensitive fields */
                <div className="space-y-4">
                  {filteredCases.map((c, i) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <TMLCard className="border border-gray-100">
                        <TMLCardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {c.is_trending && (
                                  <TMLBadge variant="trending" size="sm">
                                    <TrendingUp className="w-3 h-3 mr-1" /> Trending
                                  </TMLBadge>
                                )}
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                                  <Lock className="w-3 h-3" /> Details available upon approval
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{c.title}</h3>
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Scale className="w-4 h-4 text-[#3a164d]" />{c.practice_area}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-[#3a164d]" />{c.state}</span>
                              </div>
                            </div>
                            <div className="shrink-0">
                              <div className="flex items-center gap-2 text-gray-400">
                                <Lock className="w-5 h-5" />
                                <span className="text-sm font-medium">Locked</span>
                              </div>
                            </div>
                          </div>
                        </TMLCardContent>
                      </TMLCard>
                    </motion.div>
                  ))}

                  {filteredCases.length === 0 && (
                    <TMLCard variant="cream" className="text-center py-12">
                      <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matching Cases</h3>
                      <p className="text-gray-600">Try adjusting your filters.</p>
                    </TMLCard>
                  )}
                </div>
              ) : filteredCases.length === 0 ? (
                <TMLCard variant="cream" className="text-center py-12">
                  <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cases Found</h3>
                  <p className="text-gray-600">{hasActiveFilters ? 'Try adjusting your filters.' : 'Check back soon for new case opportunities.'}</p>
                  {hasActiveFilters && <TMLButton variant="outline" onClick={clearFilters} className="mt-4">Clear Filters</TMLButton>}
                </TMLCard>
              ) : (
                <div className="space-y-4">
                  {filteredCases.map((caseItem, index) => (
                    <motion.div key={caseItem.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                      <Link to={`${createPageUrl('CaseDetail')}?id=${caseItem.id}`}>
                        <TMLCard hover className="transition-all duration-300 hover:shadow-lg">
                          <TMLCardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-start gap-3 mb-3">
                                  {caseItem.is_trending && (
                                    <TMLBadge variant="trending" size="sm">
                                      <TrendingUp className="w-3 h-3 mr-1" /> Trending
                                    </TMLBadge>
                                  )}
                                  <TMLBadge variant="success" size="sm">Available</TMLBadge>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                                <p className="text-gray-600 mb-4 line-clamp-2">{caseItem.description}</p>
                                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                  <span className="flex items-center gap-1"><Scale className="w-4 h-4" />{caseItem.practice_area}</span>
                                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{caseItem.state}</span>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-3">
                                {caseItem.estimated_value && (
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Est. Value</p>
                                    <p className="text-2xl font-bold text-emerald-600">${caseItem.estimated_value.toLocaleString()}</p>
                                  </div>
                                )}
                                <TMLButton variant="primary" size="sm">
                                  View Details <ArrowRight className="w-4 h-4 ml-1" />
                                </TMLButton>
                              </div>
                            </div>
                          </TMLCardContent>
                        </TMLCard>
                      </Link>
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