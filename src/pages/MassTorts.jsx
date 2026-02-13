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
  ChevronDown,
  ArrowRight,
  Loader2,
  X,
  TrendingUp,
  MapPin,
  Clock
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLSelect from '@/components/ui/TMLSelect';

export default function MassTorts() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    jurisdiction: '',
    tag: '',
    sort: '-updated_date'
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
  const { data: profiles = [] } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles[0] || null;

  // Get published mass torts
  const { data: massTorts = [], isLoading: massToursLoading } = useQuery({
    queryKey: ['massTorts'],
    queryFn: () => base44.entities.MassTort.filter({ is_published: true }, filters.sort),
    enabled: !!user,
  });

  // Get all unique tags for filter
  const allTags = [...new Set(massTorts.flatMap(mt => mt.tags || []))];

  // Filter mass torts
  const filteredMassTorts = massTorts.filter(mt => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!mt.title?.toLowerCase().includes(searchLower) && 
          !mt.short_summary?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.status && mt.status !== filters.status) return false;
    if (filters.jurisdiction && mt.jurisdiction !== filters.jurisdiction) return false;
    if (filters.tag && !(mt.tags || []).includes(filters.tag)) return false;
    return true;
  });

  // Sort featured to top
  const sortedMassTorts = [...filteredMassTorts].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return 0;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      jurisdiction: '',
      tag: '',
      sort: '-updated_date'
    });
  };

  const hasActiveFilters = filters.status || filters.jurisdiction || filters.tag;

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
            <h1 className="text-3xl font-bold text-gray-900">Mass Torts</h1>
            <p className="text-gray-600 mt-1">Explore current mass tort opportunities and stay informed on the latest developments.</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search mass torts..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
              </div>
              
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

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-gray-100"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <TMLSelect
                    label="Status"
                    placeholder="All Statuses"
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'Open', label: 'Open' },
                      { value: 'Monitoring', label: 'Monitoring' },
                      { value: 'Closed', label: 'Closed' }
                    ]}
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  />
                  
                  <TMLSelect
                    label="Jurisdiction"
                    placeholder="All Jurisdictions"
                    options={[
                      { value: '', label: 'All Jurisdictions' },
                      { value: 'Federal', label: 'Federal' },
                      { value: 'State', label: 'State' },
                      { value: 'Multi-State', label: 'Multi-State' }
                    ]}
                    value={filters.jurisdiction}
                    onChange={(e) => setFilters({ ...filters, jurisdiction: e.target.value })}
                  />

                  <TMLSelect
                    label="Tag"
                    placeholder="All Tags"
                    options={[
                      { value: '', label: 'All Tags' },
                      ...allTags.map(t => ({ value: t, label: t }))
                    ]}
                    value={filters.tag}
                    onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                  />

                  <TMLSelect
                    label="Sort By"
                    options={[
                      { value: '-updated_date', label: 'Most Recent' },
                      { value: 'title', label: 'A-Z' },
                      { value: '-title', label: 'Z-A' }
                    ]}
                    value={filters.sort}
                    onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                  />
                </div>
                
                {hasActiveFilters && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-[#3a164d] hover:underline flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Clear filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              Showing <span className="font-semibold">{sortedMassTorts.length}</span> mass torts
            </p>
          </div>

          {/* Mass Torts List */}
          {massToursLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
            </div>
          ) : sortedMassTorts.length === 0 ? (
            <TMLCard variant="cream" className="text-center py-12">
              <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mass Torts Found</h3>
              <p className="text-gray-600">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Check back soon for new opportunities.'}
              </p>
            </TMLCard>
          ) : (
            <div className="space-y-4">
              {sortedMassTorts.map((massTort, index) => (
                <motion.div
                  key={massTort.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`${createPageUrl('MassTortDetail')}?slug=${massTort.slug}`}>
                    <TMLCard hover className="transition-all duration-300 hover:shadow-lg">
                      <TMLCardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3 flex-wrap">
                              {massTort.is_featured && (
                                <TMLBadge variant="trending" size="sm">
                                  <TrendingUp className="w-3 h-3 mr-1" /> Featured
                                </TMLBadge>
                              )}
                              <TMLBadge 
                                variant={
                                  massTort.status === 'Open' ? 'success' :
                                  massTort.status === 'Monitoring' ? 'warning' :
                                  'default'
                                }
                                size="sm"
                              >
                                {massTort.status}
                              </TMLBadge>
                              <TMLBadge variant="default" size="sm">
                                <MapPin className="w-3 h-3 mr-1" />
                                {massTort.jurisdiction}
                              </TMLBadge>
                            </div>
                            
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{massTort.title}</h3>
                            
                            <p className="text-gray-600 mb-4 line-clamp-2">
                              {massTort.short_summary}
                            </p>
                            
                            <div className="flex flex-wrap gap-2">
                              {(massTort.tags || []).slice(0, 3).map(tag => (
                                <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                  {tag}
                                </span>
                              ))}
                              {(massTort.tags || []).length > 3 && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">
                                  +{massTort.tags.length - 3} more
                                </span>
                              )}
                            </div>

                            {massTort.updated_date && (
                              <div className="flex items-center gap-1 text-sm text-gray-500 mt-3">
                                <Clock className="w-4 h-4" />
                                <span>Updated {new Date(massTort.updated_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-3">
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