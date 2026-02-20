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
  DollarSign,
  TrendingUp,
  ChevronDown,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLInput from '@/components/ui/TMLInput';
import TMLSelect from '@/components/ui/TMLSelect';
import { PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';

export default function CaseExchange() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    practice_area: '',
    value_min: '',
    value_max: '',
    trending_only: false
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate(createPageUrl('LawyerLogin'));
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
  const { data: profiles = [] } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles[0] || null;
  const isPending = !lawyerProfile || lawyerProfile.status === 'pending';

  // Get available cases
  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['publishedCases'],
    queryFn: () => base44.entities.Case.filter({ status: 'published' }, '-created_date'),
    enabled: !!user && !isPending,
  });

  // Filter cases
  const filteredCases = cases.filter(caseItem => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!caseItem.title?.toLowerCase().includes(searchLower) && 
          !caseItem.description?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.state && caseItem.state !== filters.state) return false;
    if (filters.practice_area && caseItem.practice_area !== filters.practice_area) return false;
    if (filters.value_min && caseItem.estimated_value < parseInt(filters.value_min)) return false;
    if (filters.value_max && caseItem.estimated_value > parseInt(filters.value_max)) return false;
    if (filters.trending_only && !caseItem.is_trending) return false;
    return true;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      state: '',
      practice_area: '',
      value_min: '',
      value_max: '',
      trending_only: false
    });
  };

  const hasActiveFilters = filters.state || filters.practice_area || filters.value_min || filters.value_max || filters.trending_only;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Case Exchange</h1>
            <p className="text-gray-600 mt-1">Browse and accept verified case referrals.</p>
          </div>

          {/* Pending Status Banner */}
          {isPending && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <TMLCard className="border-l-4 border-l-amber-500 bg-amber-50">
                <TMLCardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <Scale className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-2">Cases Unlock Once Your Membership Is Approved</h3>
                      <p className="text-gray-700 mb-4">
                        Your application is currently under review. Once approved, you'll be able to view full case details and accept cases. This typically takes 2-3 business days.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Application under review...</span>
                      </div>
                    </div>
                  </div>
                </TMLCardContent>
              </TMLCard>
            </motion.div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cases..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
              </div>
              
              {/* Filter Toggle */}
              <TMLButton 
                variant={showFilters ? 'primary' : 'outline'} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    Active
                  </span>
                )}
              </TMLButton>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-gray-100"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <TMLSelect
                    label="State"
                    placeholder="All States"
                    options={[{ value: '', label: 'All States' }, ...US_STATES.map(s => ({ value: s, label: s }))]}
                    value={filters.state}
                    onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  />
                  
                  <TMLSelect
                    label="Practice Area"
                    placeholder="All Practice Areas"
                    options={[{ value: '', label: 'All Practice Areas' }, ...PRACTICE_AREAS.map(p => ({ value: p, label: p }))]}
                    value={filters.practice_area}
                    onChange={(e) => setFilters({ ...filters, practice_area: e.target.value })}
                  />
                  
                  <TMLInput
                    label="Min Value"
                    type="number"
                    placeholder="$0"
                    value={filters.value_min}
                    onChange={(e) => setFilters({ ...filters, value_min: e.target.value })}
                  />
                  
                  <TMLInput
                    label="Max Value"
                    type="number"
                    placeholder="No max"
                    value={filters.value_max}
                    onChange={(e) => setFilters({ ...filters, value_max: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.trending_only}
                      onChange={(e) => setFilters({ ...filters, trending_only: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#3a164d] focus:ring-[#3a164d]"
                    />
                    <span className="text-sm text-gray-700">Trending cases only</span>
                  </label>
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-[#3a164d] hover:underline flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Clear filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              Showing <span className="font-semibold">{filteredCases.length}</span> cases
            </p>
          </div>

          {/* Cases List */}
          {isPending ? (
            <div className="space-y-4">
              {/* Blurred placeholder cards for pending lawyers */}
              {[1, 2, 3].map((i) => (
                <TMLCard key={i} className="relative overflow-hidden">
                  <TMLCardContent className="p-6 blur-sm select-none">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <TMLBadge variant="success" size="sm">Available</TMLBadge>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Case Title Placeholder</h3>
                        <p className="text-gray-600 mb-4">Case description details will be available once your account is approved...</p>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Scale className="w-4 h-4" />
                            <span>Practice Area</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>State</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Est. Value</p>
                          <p className="text-2xl font-bold text-emerald-600">$XX,XXX</p>
                        </div>
                      </div>
                    </div>
                  </TMLCardContent>
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                    <div className="text-center px-6">
                      <Scale className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="font-semibold text-gray-900 text-lg">Locked</p>
                      <p className="text-gray-600 text-sm">Available after approval</p>
                    </div>
                  </div>
                </TMLCard>
              ))}
            </div>
          ) : casesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
            </div>
          ) : filteredCases.length === 0 ? (
            <TMLCard variant="cream" className="text-center py-12">
              <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cases Found</h3>
              <p className="text-gray-600">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Check back soon for new case opportunities.'}
              </p>
              {hasActiveFilters && (
                <TMLButton variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </TMLButton>
              )}
            </TMLCard>
          ) : (
            <div className="space-y-4">
              {filteredCases.map((caseItem, index) => (
                <motion.div
                  key={caseItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
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
                            
                            <p className="text-gray-600 mb-4 line-clamp-2">
                              {caseItem.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-2">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Scale className="w-4 h-4" />
                                <span>{caseItem.practice_area}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <MapPin className="w-4 h-4" />
                                <span>{caseItem.state}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-3">
                            {caseItem.estimated_value && (
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Est. Value</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                  ${caseItem.estimated_value.toLocaleString()}
                                </p>
                              </div>
                            )}
                            <TMLButton variant="primary" size="sm">
                              View Details
                              <ArrowRight className="w-4 h-4 ml-1" />
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
        </div>
      </main>
    </div>
  );
}