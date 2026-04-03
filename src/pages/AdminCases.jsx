import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser } from '@/services/auth';
import { listCases, createCase, updateCase } from '@/services/cases';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Scale,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  DollarSign,
  TrendingUp,
  Loader2,
  X,
  Plus,
  Eye,
  Edit,
  Mail,
  Phone } from
'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLSelect from '@/components/ui/TMLSelect';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CASE_STATUSES, PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';

export default function AdminCases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingCase, setViewingCase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    state: '',
    practice_area: ''
  });

  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    state: '',
    practice_area: '',
    estimated_value: '',
    is_trending: false,
    key_facts: ''
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

  // Get cases
  const { data: cases = [], isLoading: casesLoading, refetch } = useQuery({
    queryKey: ['allCases'],
    queryFn: () => listCases(),
    enabled: !!user
  });

  // Filter cases
  const filteredCases = cases.filter((caseItem) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!caseItem.title?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.status && caseItem.status !== filters.status) return false;
    if (filters.state && caseItem.state !== filters.state) return false;
    if (filters.practice_area && caseItem.practice_area !== filters.practice_area) return false;
    return true;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      state: '',
      practice_area: ''
    });
  };

  const hasActiveFilters = filters.status || filters.state || filters.practice_area;

  // Status counts
  const statusCounts = cases.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const quickFilters = [
  { value: '', label: 'All', count: cases.length },
  { value: 'published', label: 'Published', count: statusCounts.published || 0 },
  { value: 'accepted', label: 'Accepted', count: statusCounts.accepted || 0 },
  { value: 'in_progress', label: 'In Progress', count: statusCounts.in_progress || 0 },
  { value: 'closed', label: 'Closed', count: statusCounts.closed || 0 }];


  const handleToggleTrending = async (caseItem) => {
    setSaving(true);

    try {
      await updateCase(caseItem.id, {
        is_trending: !caseItem.is_trending
      });

      setSuccess(caseItem.is_trending ? 'Removed from trending' : 'Added to trending');
      refetch();
    } catch (err) {
      console.error('Error updating case:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (caseItem) => {
    if (!confirm('Are you sure you want to withdraw this case?')) return;

    setSaving(true);

    try {
      await updateCase(caseItem.id, {
        status: 'withdrawn'
      });

      setSuccess('Case withdrawn');
      refetch();
    } catch (err) {
      console.error('Error withdrawing case:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCase = async () => {
    if (!newCase.title || !newCase.state || !newCase.practice_area) return;

    setSaving(true);

    try {
      const caseData = {
        title: newCase.title,
        description: newCase.description,
        state: newCase.state,
        practice_area: newCase.practice_area,
        estimated_value: newCase.estimated_value ? parseFloat(newCase.estimated_value) : null,
        is_trending: newCase.is_trending,
        key_facts: newCase.key_facts ? newCase.key_facts.split('\n').filter((f) => f.trim()) : [],
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: user.email
      };

      await createCase(caseData);

      setSuccess('Case created and published!');
      setShowCreateModal(false);
      setNewCase({
        title: '',
        description: '',
        state: '',
        practice_area: '',
        estimated_value: '',
        is_trending: false,
        key_facts: ''
      });
      refetch();
    } catch (err) {
      console.error('Error creating case:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleViewCase = (caseItem) => {
    setViewingCase({
      ...caseItem,
      description: caseItem.description || '',
      estimated_value: caseItem.estimated_value || '',
      lawyer_notes: caseItem.lawyer_notes || ''
    });
  };

  const handleSaveChanges = async () => {
    if (!viewingCase) return;

    setSaving(true);
    try {
      await updateCase(viewingCase.id, {
        description: viewingCase.description,
        estimated_value: viewingCase.estimated_value ? parseFloat(viewingCase.estimated_value) : null,
        lawyer_notes: viewingCase.lawyer_notes
      });

      setSuccess('Case updated successfully!');
      setViewingCase(null);
      refetch();
    } catch (err) {
      console.error('Error updating case:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar user={user} />
      
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Case Management</h1>
              <p className="text-gray-600 mt-1">Manage marketplace cases and referrals.</p>
            </div>
            <TMLButton variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Case
            </TMLButton>
          </div>

          {/* Success Message */}
          {success &&
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-xl">

              <CheckCircle2 className="w-5 h-5" />
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          }

          {/* Quick Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {quickFilters.map((qf) =>
            <button
              key={qf.value}
              onClick={() => setFilters({ ...filters, status: qf.value })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filters.status === qf.value ?
              'bg-[#7e277e] text-white' :
              'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`
              }>

                {qf.label}
                <span className={`ml-2 ${filters.status === qf.value ? 'text-white/80' : 'text-gray-400'}`}>
                  ({qf.count})
                </span>
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cases..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7e277e]/20 focus:border-[#7e277e]" />

              </div>
              
              <TMLButton
                variant={showFilters ? 'primary' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}>

                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </TMLButton>
            </div>

            {showFilters &&
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-gray-100">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TMLSelect
                  label="State"
                  placeholder="All States"
                  options={[{ value: '', label: 'All States' }, ...US_STATES.map((s) => ({ value: s, label: s }))]}
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })} />

                  
                  <TMLSelect
                  label="Practice Area"
                  placeholder="All Areas"
                  options={[{ value: '', label: 'All Areas' }, ...PRACTICE_AREAS.map((p) => ({ value: p, label: p }))]}
                  value={filters.practice_area}
                  onChange={(e) => setFilters({ ...filters, practice_area: e.target.value })} />

                </div>
                
                {hasActiveFilters &&
              <div className="flex justify-end mt-4">
                    <button
                  onClick={clearFilters}
                  className="text-sm text-[#7e277e] hover:underline flex items-center gap-1">

                      <X className="w-4 h-4" /> Clear filters
                    </button>
                  </div>
              }
              </motion.div>
            }
          </div>

          {/* Results */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              Showing <span className="font-semibold">{filteredCases.length}</span> cases
            </p>
          </div>

          {/* Cases List */}
          {casesLoading ?
          <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
            </div> :
          filteredCases.length === 0 ?
          <TMLCard variant="cream" className="text-center py-12">
              <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cases Found</h3>
              <p className="text-gray-600">
                {hasActiveFilters || filters.search ?
              'Try adjusting your filters.' :
              'Create a case to get started.'}
              </p>
            </TMLCard> :

          <div className="grid gap-4">
              {filteredCases.map((caseItem, index) =>
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}>

                  <TMLCard hover className="transition-all duration-200 hover:shadow-md">
                    <TMLCardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {caseItem.is_trending &&
                        <TMLBadge variant="trending" size="sm">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Trending
                              </TMLBadge>
                        }
                            <TMLBadge
                          variant={
                          caseItem.status === 'published' ? 'success' :
                          caseItem.status === 'accepted' ? 'info' :
                          caseItem.status === 'withdrawn' ? 'danger' :
                          'default'
                          }
                          size="sm">

                              {CASE_STATUSES[caseItem.status]?.label || caseItem.status}
                            </TMLBadge>
                          </div>
                          
                          <h3 className="font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Scale className="w-4 h-4" />
                              {caseItem.practice_area}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {caseItem.state}
                            </span>
                            {caseItem.estimated_value &&
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <DollarSign className="w-4 h-4" />
                                ${caseItem.estimated_value.toLocaleString()}
                              </span>
                        }
                            {caseItem.accepted_by_email &&
                        <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {caseItem.accepted_by_email}
                              </span>
                        }
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <TMLButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewCase(caseItem)}>

                            <Eye className="w-4 h-4" />
                          </TMLButton>
                          
                          <TMLButton
                        variant={caseItem.is_trending ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleTrending(caseItem)}
                        loading={saving}>

                            <TrendingUp className="w-4 h-4" />
                          </TMLButton>
                          
                          {caseItem.status === 'published' &&
                      <TMLButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdraw(caseItem)}
                        loading={saving}>

                              Withdraw
                            </TMLButton>
                      }
                        </div>
                      </div>
                    </TMLCardContent>
                  </TMLCard>
                </motion.div>
            )}
            </div>
          }
        </div>
      </main>

      {/* Create Case Modal */}
      {showCreateModal &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">

            <h3 className="text-xl font-bold text-gray-900 mb-6">Create New Case</h3>
            
            <div className="space-y-4">
              <TMLInput
              label="Case Title"
              placeholder="e.g., Personal Injury Case - Texas"
              value={newCase.title}
              onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
              required />

              
              <TMLTextarea
              label="Description"
              placeholder="Describe the case details..."
              value={newCase.description}
              onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
              rows={4} />

              
              <div className="grid grid-cols-2 gap-4">
                <TMLSelect
                label="State"
                placeholder="Select state"
                options={US_STATES.map((s) => ({ value: s, label: s }))}
                value={newCase.state}
                onChange={(e) => setNewCase({ ...newCase, state: e.target.value })}
                required />

                
                <TMLSelect
                label="Practice Area"
                placeholder="Select practice area"
                options={PRACTICE_AREAS.map((p) => ({ value: p, label: p }))}
                value={newCase.practice_area}
                onChange={(e) => setNewCase({ ...newCase, practice_area: e.target.value })}
                required />

              </div>
              
              <TMLInput
              label="Estimated Value ($)"
              type="number"
              placeholder="Enter estimated case value"
              value={newCase.estimated_value}
              onChange={(e) => setNewCase({ ...newCase, estimated_value: e.target.value })} />

              
              <TMLTextarea
              label="Key Facts (one per line)"
              placeholder="Enter key facts, one per line..."
              value={newCase.key_facts}
              onChange={(e) => setNewCase({ ...newCase, key_facts: e.target.value })}
              rows={3} />

              
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                checked={newCase.is_trending}
                onCheckedChange={(checked) => setNewCase({ ...newCase, is_trending: checked })} />

                <span className="text-sm text-gray-700">Mark as trending</span>
              </label>
            </div>
            
            <div className="flex gap-3 mt-6">
              <TMLButton variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </TMLButton>
              <TMLButton
              variant="primary"
              onClick={handleCreateCase}
              className="flex-1"
              loading={saving}
              disabled={!newCase.title || !newCase.state || !newCase.practice_area}>

                Create & Publish
              </TMLButton>
            </div>
          </motion.div>
        </div>
      }

      {/* View/Edit Case Modal */}
      {viewingCase &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{viewingCase.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {viewingCase.practice_area} • {viewingCase.state}
                </p>
              </div>
              <button onClick={() => setViewingCase(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Client Information */}
              {(viewingCase.client_first_name || viewingCase.client_email || viewingCase.client_phone) &&
            <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Client Contact</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    {viewingCase.client_first_name &&
                <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{viewingCase.client_first_name} {viewingCase.client_last_name}</span>
                      </div>
                }
                    {viewingCase.client_email &&
                <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${viewingCase.client_email}`} className="hover:text-[#7e277e]">
                          {viewingCase.client_email}
                        </a>
                      </div>
                }
                    {viewingCase.client_phone &&
                <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${viewingCase.client_phone}`} className="hover:text-[#7e277e]">
                          {viewingCase.client_phone}
                        </a>
                      </div>
                }
                  </div>
                </div>
            }

              {/* Key Facts */}
              {viewingCase.key_facts && viewingCase.key_facts.length > 0 &&
            <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Key Facts</h4>
                  <ul className="space-y-2">
                    {viewingCase.key_facts.map((fact, idx) =>
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{fact}</span>
                      </li>
                )}
                  </ul>
                </div>
            }

              {/* Case Status Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {CASE_STATUSES[viewingCase.status]?.label || viewingCase.status}
                    </span>
                  </div>
                  {viewingCase.accepted_by_email &&
                <div>
                      <span className="text-gray-500">Accepted by:</span>
                      <span className="ml-2 font-medium text-gray-900">{viewingCase.accepted_by_email}</span>
                    </div>
                }
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900">Case Details</h4>
                
                <TMLTextarea
                label="Case Notes / Description"
                placeholder="Add notes or update case description..."
                value={viewingCase.description}
                onChange={(e) => setViewingCase({ ...viewingCase, description: e.target.value })}
                rows={4} />

                
                







                <TMLTextarea
                label="Attorney Notes / Questions"
                placeholder="Notes or questions from the accepting attorney..."
                helperText="This field shows communications from the attorney who accepted this case"
                value={viewingCase.lawyer_notes}
                onChange={(e) => setViewingCase({ ...viewingCase, lawyer_notes: e.target.value })}
                rows={4} />

              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex gap-3">
              <TMLButton variant="outline" onClick={() => setViewingCase(null)} className="flex-1">
                Close
              </TMLButton>
              <TMLButton
              variant="primary"
              onClick={handleSaveChanges}
              className="flex-1"
              loading={saving}>

                <Edit className="w-4 h-4 mr-2" />
                Save Changes
              </TMLButton>
            </div>
          </motion.div>
        </div>
      }
    </div>);

}