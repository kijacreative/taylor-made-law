import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser } from '@/services/auth';
import { listLeads } from '@/services/cases';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Inbox,
  ArrowRight,
  Clock,
  User,
  Phone,
  Mail,
  Loader2,
  X,
  ChevronDown
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLSelect from '@/components/ui/TMLSelect';
import { LEAD_STATUSES, PRACTICE_AREAS, US_STATES, URGENCY_LEVELS } from '@/components/design/DesignTokens';

export default function AdminLeads() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    state: '',
    practice_area: '',
    urgency: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) {
          navigate(createPageUrl('Home'));
          return;
        }
        
        if (!['admin', 'senior_associate', 'junior_associate'].includes(userData.user_type) && userData.role !== 'admin') {
          navigate(createPageUrl('LawyerDashboard'));
          return;
        }
        
        setUser(userData);
      } catch (e) {
        navigate(createPageUrl('Home'));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // Get leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['allLeads'],
    queryFn: () => listLeads(),
    enabled: !!user,
  });

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
      if (!fullName.includes(searchLower) && !lead.email?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.state && lead.state !== filters.state) return false;
    if (filters.practice_area && lead.practice_area !== filters.practice_area) return false;
    if (filters.urgency && lead.urgency !== filters.urgency) return false;
    return true;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      state: '',
      practice_area: '',
      urgency: ''
    });
  };

  const hasActiveFilters = filters.status || filters.state || filters.practice_area || filters.urgency;

  // Group by status for quick tabs
  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const quickFilters = [
    { value: '', label: 'All', count: leads.length },
    { value: 'new', label: 'New', count: statusCounts.new || 0 },
    { value: 'junior_review', label: 'Junior Review', count: statusCounts.junior_review || 0 },
    { value: 'senior_review', label: 'Senior Review', count: statusCounts.senior_review || 0 },
    { value: 'approved', label: 'Approved', count: statusCounts.approved || 0 },
    { value: 'published', label: 'Published', count: statusCounts.published || 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar user={user} />
      
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Leads Queue</h1>
            <p className="text-gray-600 mt-1">Review and process incoming client requests.</p>
          </div>

          {/* Quick Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {quickFilters.map((qf) => (
              <button
                key={qf.value}
                onClick={() => setFilters({ ...filters, status: qf.value })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filters.status === qf.value
                    ? 'bg-[#7e277e] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {qf.label}
                <span className={`ml-2 ${filters.status === qf.value ? 'text-white/80' : 'text-gray-400'}`}>
                  ({qf.count})
                </span>
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7e277e]/20 focus:border-[#7e277e]"
                />
              </div>
              
              <TMLButton 
                variant={showFilters ? 'primary' : 'outline'} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                More Filters
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
                    label="State"
                    placeholder="All States"
                    options={[{ value: '', label: 'All States' }, ...US_STATES.map(s => ({ value: s, label: s }))]}
                    value={filters.state}
                    onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  />
                  
                  <TMLSelect
                    label="Practice Area"
                    placeholder="All Areas"
                    options={[{ value: '', label: 'All Areas' }, ...PRACTICE_AREAS.map(p => ({ value: p, label: p }))]}
                    value={filters.practice_area}
                    onChange={(e) => setFilters({ ...filters, practice_area: e.target.value })}
                  />
                  
                  <TMLSelect
                    label="Urgency"
                    placeholder="All Urgency"
                    options={[{ value: '', label: 'All Urgency' }, ...URGENCY_LEVELS.map(u => ({ value: u.value, label: u.label }))]}
                    value={filters.urgency}
                    onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
                  />
                </div>
                
                {hasActiveFilters && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-[#7e277e] hover:underline flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Clear all filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Results */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              Showing <span className="font-semibold">{filteredLeads.length}</span> leads
            </p>
          </div>

          {/* Leads List */}
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <TMLCard variant="cream" className="text-center py-12">
              <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Leads Found</h3>
              <p className="text-gray-600">
                {hasActiveFilters || filters.search
                  ? 'Try adjusting your filters.'
                  : 'New leads will appear here.'}
              </p>
            </TMLCard>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead, index) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link to={`${createPageUrl('AdminLeadDetail')}?id=${lead.id}`}>
                    <TMLCard hover className="transition-all duration-200 hover:shadow-md">
                      <TMLCardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7e277e] to-[#993333] flex items-center justify-center text-white font-semibold">
                              {lead.first_name?.charAt(0)}{lead.last_name?.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-gray-900">
                                  {lead.first_name} {lead.last_name}
                                </h3>
                                <TMLBadge 
                                  variant={
                                    lead.status === 'new' ? 'info' :
                                    lead.status === 'approved' ? 'success' :
                                    lead.status === 'rejected' ? 'danger' :
                                    lead.status === 'published' ? 'success' :
                                    'warning'
                                  }
                                  size="sm"
                                >
                                  {LEAD_STATUSES[lead.status]?.label || lead.status}
                                </TMLBadge>
                                {lead.urgency === 'urgent' && (
                                  <TMLBadge variant="danger" size="sm">Urgent</TMLBadge>
                                )}
                                {lead.urgency === 'high' && (
                                  <TMLBadge variant="warning" size="sm">High Priority</TMLBadge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-4 h-4" />
                                  {lead.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {lead.phone}
                                </span>
                                <span>{lead.practice_area}</span>
                                <span>•</span>
                                <span>{lead.state}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(lead.created_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
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