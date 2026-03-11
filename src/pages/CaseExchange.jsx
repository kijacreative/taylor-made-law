import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Loader2,
  Plus,
  Scale,
  Search,
  Filter,
  X,
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLSelect from '@/components/ui/TMLSelect';
import { US_STATES } from '@/components/design/DesignTokens';
import SubmitCaseModal from '@/components/cases/SubmitCaseModal';

export default function CaseExchange() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [lawyerProfile, setLawyerProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    state: '',
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

  const isApproved = user?.user_status === 'approved' || (!user?.user_status && lawyerProfile?.status === 'approved');

  // Server-side enforced case fetch
  const { data: caseData, isLoading: casesLoading } = useQuery({
    queryKey: ['casesForLawyer', user?.id, selectedCategory],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCasesForLawyer', { practice_area: selectedCategory });
      return res.data;
    },
    enabled: !!user && !!selectedCategory,
  });

  const cases = caseData?.cases || [];

  // Define practice area categories with icons
  const FamilySVG = (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Adult 1 (left) */}
      <circle cx="35" cy="20" r="8" stroke="white" strokeWidth="2.5"/>
      <path d="M 35 30 L 35 50 M 35 35 L 25 45 M 35 35 L 45 45 M 35 50 L 25 70 M 35 50 L 45 70" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Adult 2 (right) */}
      <circle cx="65" cy="20" r="8" stroke="white" strokeWidth="2.5"/>
      <path d="M 65 30 L 65 50 M 65 35 L 55 45 M 65 35 L 75 45 M 65 50 L 55 70 M 65 50 L 75 70" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Child (center) */}
      <circle cx="50" cy="35" r="6" stroke="white" strokeWidth="2.5"/>
      <path d="M 50 43 L 50 58 M 50 46 L 42 54 M 50 46 L 58 54 M 50 58 L 42 72 M 50 58 L 58 72" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const HouseSVG = (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Roof */}
      <polyline points="10,50 50,10 90,50" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Chimney */}
      <rect x="65" y="18" width="10" height="20" rx="1" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Walls */}
      <rect x="18" y="50" width="64" height="38" rx="2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Door */}
      <path d="M 43 88 L 43 68 Q 43 64 50 64 Q 57 64 57 68 L 57 88" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Left Window */}
      <rect x="24" y="58" width="14" height="14" rx="1.5" stroke="white" strokeWidth="2.5"/>
      <line x1="31" y1="58" x2="31" y2="72" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="24" y1="65" x2="38" y2="65" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Right Window */}
      <rect x="62" y="58" width="14" height="14" rx="1.5" stroke="white" strokeWidth="2.5"/>
      <line x1="69" y1="58" x2="69" y2="72" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="62" y1="65" x2="76" y2="65" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const GavelSVG = (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Gavel head */}
      <rect x="52" y="10" width="36" height="18" rx="4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(45 52 10)"/>
      {/* Gavel handle */}
      <line x1="38" y1="52" x2="10" y2="80" stroke="white" strokeWidth="5" strokeLinecap="round"/>
      {/* Sound block */}
      <rect x="15" y="82" width="70" height="10" rx="4" stroke="white" strokeWidth="2.5"/>
    </svg>
  );

  const ClassActionSVG = (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="50" cy="50" r="44" stroke="white" strokeWidth="2" strokeDasharray="4 3"/>
      {/* Top person */}
      <circle cx="50" cy="12" r="5" stroke="white" strokeWidth="2"/>
      <path d="M44 20 Q50 24 56 20" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <line x1="50" y1="24" x2="50" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Bottom person */}
      <circle cx="50" cy="88" r="5" stroke="white" strokeWidth="2"/>
      <path d="M44 80 Q50 76 56 80" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <line x1="50" y1="76" x2="50" y2="68" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Left person */}
      <circle cx="12" cy="50" r="5" stroke="white" strokeWidth="2"/>
      <path d="M20 44 Q24 50 20 56" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <line x1="24" y1="50" x2="32" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Right person */}
      <circle cx="88" cy="50" r="5" stroke="white" strokeWidth="2"/>
      <path d="M80 44 Q76 50 80 56" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <line x1="76" y1="50" x2="68" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Top-left person */}
      <circle cx="22" cy="22" r="5" stroke="white" strokeWidth="2"/>
      <path d="M27 28 Q30 32 34 28" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <line x1="30" y1="32" x2="34" y2="38" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Top-right person */}
      <circle cx="78" cy="22" r="5" stroke="white" strokeWidth="2"/>
      <path d="M66 28 Q70 32 73 28" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <line x1="70" y1="32" x2="66" y2="38" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Bottom-left person */}
      <circle cx="22" cy="78" r="5" stroke="white" strokeWidth="2"/>
      <path d="M27 72 Q30 68 34 72" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <line x1="30" y1="68" x2="34" y2="62" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Bottom-right person */}
      <circle cx="78" cy="78" r="5" stroke="white" strokeWidth="2"/>
      <path d="M66 72 Q70 68 73 72" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <line x1="70" y1="68" x2="66" y2="62" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const KeySVG = (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Key ring / bow */}
      <circle cx="35" cy="38" r="20" stroke="white" strokeWidth="2.5"/>
      <circle cx="35" cy="38" r="10" stroke="white" strokeWidth="2.5"/>
      {/* Key blade */}
      <line x1="50" y1="50" x2="88" y2="82" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Teeth */}
      <line x1="68" y1="62" x2="74" y2="56" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="76" y1="70" x2="82" y2="64" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  const InjurySVG = (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="50" cy="16" r="10" stroke="white" strokeWidth="2.5"/>
      {/* Body */}
      <line x1="50" y1="26" x2="50" y2="58" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Left arm normal */}
      <line x1="50" y1="34" x2="28" y2="46" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Right arm in sling */}
      <path d="M 50 34 L 68 36 L 72 48 L 58 54 Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Legs */}
      <line x1="50" y1="58" x2="36" y2="82" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="50" y1="58" x2="64" y2="82" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Crutch under left arm */}
      <line x1="28" y1="46" x2="22" y2="82" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="18" y1="44" x2="30" y2="44" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="20" y1="82" x2="26" y2="82" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  const categories = [
    { name: 'Criminal', icon: GavelSVG, desc: 'Criminal Defense', isSVG: true },
    { name: 'Family', icon: FamilySVG, desc: 'Family Law', isSVG: true },
    { name: 'Estate', icon: HouseSVG, desc: 'Estate Planning', isSVG: true },
    { name: 'Personal Injury', icon: InjurySVG, desc: 'Personal Injury', isSVG: true },
    { name: 'Mass Torts', icon: KeySVG, desc: 'Mass Tort Litigation', isSVG: true },
    { name: 'Class Actions', icon: ClassActionSVG, desc: 'Class Actions', isSVG: true },
  ];

  const hasActiveFilters = filters.state || filters.search;
  const clearFilters = () => setFilters({ search: '', state: '' });

  const filteredCases = cases.filter(c => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!c.title?.toLowerCase().includes(s) && !c.practice_area?.toLowerCase().includes(s)) return false;
    }
    if (filters.state && c.state !== filters.state) return false;
    return true;
  });

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  if (!selectedCategory) {
    // Category selection view
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <AppSidebar user={user} lawyerProfile={lawyerProfile} />

        <main className="ml-64 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-12 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Case Exchange</h1>
                <p className="text-gray-600 mt-2">Browse cases by practice area</p>
              </div>
              {isApproved && (
                <TMLButton variant="primary" onClick={() => setShowSubmitModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit a Case
                </TMLButton>
              )}
            </div>

            {showSubmitModal && (
              <SubmitCaseModal user={user} onClose={() => setShowSubmitModal(false)} />
            )}

            {/* Category Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
              {categories.map((cat, idx) => (
                <motion.button
                  key={cat.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedCategory(cat.name)}
                  className="group cursor-pointer"
                >
                  <div className="flex flex-col items-center">
                    {/* Circular Icon Container - #3a164d with white icon */}
                    <div
                      className="w-40 h-40 rounded-full flex items-center justify-center mb-4 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105"
                      style={{ backgroundColor: '#3a164d' }}
                    >
                      {cat.isSVG ? (
                        <div className="scale-110">{cat.icon}</div>
                      ) : (
                        <span className="text-6xl filter brightness-0 invert">{cat.icon}</span>
                      )}
                    </div>
                    {/* Text */}
                    <h3 className="text-xl font-bold text-gray-900 text-center">{cat.name}</h3>
                    <p className="text-sm text-gray-600 text-center mt-1">{cat.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Case list view for selected category
  const selectedCategoryObj = categories.find(c => c.name === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors"
              >
                ← Back to Categories
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedCategory}</h1>
              </div>
            </div>
            {isApproved && (
              <TMLButton variant="primary" onClick={() => setShowSubmitModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Submit a Case
              </TMLButton>
            )}
          </div>

          {showSubmitModal && (
            <SubmitCaseModal user={user} onClose={() => setShowSubmitModal(false)} />
          )}

          {casesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
            </div>
          ) : (
            <>
              {/* Search + Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search cases..."
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TMLSelect
                        label="State"
                        placeholder="All States"
                        options={[{ value: '', label: 'All States' }, ...US_STATES.map(s => ({ value: s, label: s }))]}
                        value={filters.state}
                        onChange={e => setFilters({ ...filters, state: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-end mt-4">
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
                  Showing <span className="font-semibold">{filteredCases.length}</span> cases
                </p>
              </div>

              {filteredCases.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cases Available</h3>
                  <p className="text-gray-600">Check back soon for new {selectedCategory} cases.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCases.map((caseItem, index) => (
                    <motion.div
                      key={caseItem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <a href={`${createPageUrl('CaseDetail')}?id=${caseItem.id}`}>
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                              <p className="text-gray-600 mb-4 line-clamp-2">{caseItem.description}</p>
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Scale className="w-4 h-4" />{caseItem.practice_area}</span>
                                {caseItem.state && <span className="flex items-center gap-1">📍 {caseItem.state}</span>}
                              </div>
                            </div>

                          </div>
                        </div>
                      </a>
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