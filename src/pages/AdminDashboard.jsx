import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Users, 
  Scale, 
  Inbox, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  BarChart3,
  Loader2,
  MapPin
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import { LEAD_STATUSES, PRACTICE_AREAS } from '@/components/design/DesignTokens';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate(createPageUrl('Home'));
          return;
        }
        const userData = await base44.auth.me();
        
        // Only allow admin/associate users
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
  const { data: leads = [] } = useQuery({
    queryKey: ['allLeads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    enabled: !!user,
  });

  // Get cases
  const { data: cases = [] } = useQuery({
    queryKey: ['allCases'],
    queryFn: () => base44.entities.Case.list('-created_date'),
    enabled: !!user,
  });

  // Get lawyers
  const { data: lawyers = [] } = useQuery({
    queryKey: ['allLawyers'],
    queryFn: () => base44.entities.LawyerProfile.list('-created_date'),
    enabled: !!user,
  });

  // Stats calculations
  const pendingLeads = leads.filter(l => ['new', 'junior_review', 'senior_review'].includes(l.status)).length;
  const publishedCases = cases.filter(c => c.status === 'published').length;
  const acceptedCases = cases.filter(c => c.status === 'accepted').length;
  const pendingLawyers = lawyers.filter(l => l.status === 'pending').length;
  const approvedLawyers = lawyers.filter(l => l.status === 'approved').length;
  
  const totalReferralValue = cases
    .filter(c => ['accepted', 'in_progress', 'closed'].includes(c.status))
    .reduce((sum, c) => sum + (c.estimated_value || 0), 0);

  // Lawyers by state
  const lawyersByState = lawyers.reduce((acc, l) => {
    (l.states_licensed || []).forEach(state => {
      acc[state] = (acc[state] || 0) + 1;
    });
    return acc;
  }, {});

  const topStates = Object.entries(lawyersByState)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Lawyers by practice area
  const lawyersByArea = lawyers.reduce((acc, l) => {
    (l.practice_areas || []).forEach(area => {
      acc[area] = (acc[area] || 0) + 1;
    });
    return acc;
  }, {});

  const topAreas = Object.entries(lawyersByArea)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Recent leads needing review
  const recentPendingLeads = leads
    .filter(l => ['new', 'junior_review'].includes(l.status))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of Taylor Made Law operations.</p>
          </div>

          {/* Alert Banner */}
          {pendingLeads > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <TMLCard className="border-l-4 border-l-amber-500 bg-amber-50">
                <TMLCardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {pendingLeads} leads awaiting review
                      </p>
                      <p className="text-sm text-gray-600">Review queue has pending items</p>
                    </div>
                  </div>
                  <Link to={createPageUrl('AdminLeads')}>
                    <TMLButton variant="accent" size="sm">
                      Review Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </TMLButton>
                  </Link>
                </TMLCardContent>
              </TMLCard>
            </motion.div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Attorneys</p>
                    <p className="text-3xl font-bold text-gray-900">{lawyers.length}</p>
                    <p className="text-sm text-emerald-600 mt-1">
                      {approvedLawyers} approved • {pendingLawyers} pending
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>

            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Active Cases</p>
                    <p className="text-3xl font-bold text-gray-900">{publishedCases + acceptedCases}</p>
                    <p className="text-sm text-blue-600 mt-1">
                      {publishedCases} available • {acceptedCases} accepted
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Scale className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>

            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pending Leads</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingLeads}</p>
                    <p className="text-sm text-amber-600 mt-1">
                      Awaiting review
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Inbox className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>

            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Referral Value</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${totalReferralValue.toLocaleString()}
                    </p>
                    <p className="text-sm text-emerald-600 mt-1">
                      Total case value
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Leads Queue */}
            <div className="lg:col-span-2">
              <TMLCard variant="elevated">
                <TMLCardHeader className="flex items-center justify-between">
                  <TMLCardTitle className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-[#3a164d]" />
                    Leads Requiring Review
                  </TMLCardTitle>
                  <Link to={createPageUrl('AdminLeads')} className="text-sm text-[#3a164d] hover:underline">
                    View All
                  </Link>
                </TMLCardHeader>
                <TMLCardContent>
                  {recentPendingLeads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <p>All caught up! No pending leads.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentPendingLeads.map((lead) => (
                        <Link 
                          key={lead.id}
                          to={`${createPageUrl('AdminLeadDetail')}?id=${lead.id}`}
                          className="block"
                        >
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {lead.first_name} {lead.last_name}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span>{lead.practice_area}</span>
                                <span>•</span>
                                <span>{lead.state}</span>
                              </div>
                            </div>
                            <TMLBadge 
                              variant={lead.status === 'new' ? 'info' : 'warning'}
                              size="sm"
                            >
                              {LEAD_STATUSES[lead.status]?.label || lead.status}
                            </TMLBadge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </TMLCardContent>
              </TMLCard>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              {/* Top States */}
              <TMLCard variant="elevated">
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-4 h-4 text-[#3a164d]" />
                    Attorneys by State
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent>
                  {topStates.length === 0 ? (
                    <p className="text-sm text-gray-500">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topStates.map(([state, count]) => (
                        <div key={state} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{state}</span>
                          <span className="text-sm font-semibold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TMLCardContent>
              </TMLCard>

              {/* Top Practice Areas */}
              <TMLCard variant="elevated">
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2 text-base">
                    <Scale className="w-4 h-4 text-[#3a164d]" />
                    Top Practice Areas
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent>
                  {topAreas.length === 0 ? (
                    <p className="text-sm text-gray-500">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topAreas.map(([area, count]) => (
                        <div key={area} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{area}</span>
                          <span className="text-sm font-semibold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TMLCardContent>
              </TMLCard>

              {/* Quick Actions */}
              <TMLCard variant="cream">
                <TMLCardHeader>
                  <TMLCardTitle className="text-base">Quick Actions</TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-2">
                  <Link to={createPageUrl('AdminLeads')} className="block">
                    <TMLButton variant="outline" className="w-full justify-start">
                      <Inbox className="w-4 h-4 mr-2" />
                      Review Leads
                    </TMLButton>
                  </Link>
                  <Link to={createPageUrl('AdminLawyers')} className="block">
                    <TMLButton variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Manage Lawyers
                    </TMLButton>
                  </Link>
                  <Link to={createPageUrl('AdminCases')} className="block">
                    <TMLButton variant="outline" className="w-full justify-start">
                      <Scale className="w-4 h-4 mr-2" />
                      Manage Cases
                    </TMLButton>
                  </Link>
                </TMLCardContent>
              </TMLCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}