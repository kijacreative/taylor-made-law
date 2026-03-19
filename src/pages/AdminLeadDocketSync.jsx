import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw,
  Eye,
  X,
  RefreshCw,
  Inbox,
  TrendingUp
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

function ErrorModal({ error, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Sync Error Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-mono text-red-800 whitespace-pre-wrap break-words">
              {error}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminLeadDocketSync() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState(null);
  const [retrySyncId, setRetrySyncId] = useState(null);
  const [retryingIds, setRetryingIds] = useState(new Set());

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate(createPageUrl('Home'));
          return;
        }
        const userData = await base44.auth.me();

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
    queryFn: () => base44.entities.Lead.list('-created_date'),
    enabled: !!user,
  });

  // Calculate sync stats
  const syncStats = leads.reduce(
    (acc, lead) => {
      if (lead.sync_status === 'sent') acc.synced += 1;
      else if (lead.sync_status === 'failed') acc.failed += 1;
      else acc.pending += 1;
      return acc;
    },
    { synced: 0, failed: 0, pending: 0 }
  );

  const failedLeads = leads.filter((lead) => lead.sync_status === 'failed');
  const syncedLeads = leads.filter((lead) => lead.sync_status === 'sent');
  const pendingLeads = leads.filter((lead) => !lead.sync_status || lead.sync_status === 'pending');

  const handleRetrySync = async (leadId) => {
    setRetryingIds((prev) => new Set([...prev, leadId]));
    try {
      const res = await base44.functions.invoke('retrySyncLead', { lead_id: leadId });
      if (res.data?.error) {
        throw new Error(res.data.error);
      }
      queryClient.invalidateQueries({ queryKey: ['allLeads'] });
    } catch (err) {
      alert('Retry failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Lead Docket Sync Status</h1>
            <p className="text-gray-600 mt-1">Monitor and manage Lead Docket synchronization.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Successfully Synced</p>
                    <p className="text-3xl font-bold text-gray-900">{syncStats.synced}</p>
                    <p className="text-sm text-emerald-600 mt-1">Leads sent to Lead Docket</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>

            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Failed Syncs</p>
                    <p className="text-3xl font-bold text-gray-900">{syncStats.failed}</p>
                    <p className="text-sm text-red-600 mt-1">Require manual retry</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>

            <TMLCard hover>
              <TMLCardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-gray-900">{syncStats.pending}</p>
                    <p className="text-sm text-amber-600 mt-1">Awaiting sync</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>
          </div>

          {/* Failed Syncs Section */}
          {failedLeads.length > 0 && (
            <div className="mb-8">
              <TMLCard variant="elevated">
                <TMLCardHeader className="border-b border-red-200 bg-red-50">
                  <TMLCardTitle className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    Failed Syncs ({failedLeads.length})
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent>
                  <div className="space-y-3">
                    {failedLeads.map((lead) => (
                      <motion.div
                        key={lead.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {lead.first_name} {lead.last_name}
                            </h4>
                            <TMLBadge variant="danger" size="sm">Failed</TMLBadge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>{lead.email} • {lead.phone}</p>
                            <p>{lead.practice_area} • {lead.state}</p>
                            {lead.last_sync_attempt_at && (
                              <p className="text-xs text-gray-500">
                                Last attempt: {formatDate(lead.last_sync_attempt_at)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {lead.sync_error_message && (
                            <button
                              onClick={() => setSelectedError(lead.sync_error_message)}
                              className="p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-100 transition-colors"
                              title="View error details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <TMLButton
                            variant="primary"
                            size="sm"
                            loading={retryingIds.has(lead.id)}
                            onClick={() => handleRetrySync(lead.id)}
                          >
                            <RotateCw className="w-4 h-4 mr-1.5" />
                            Retry
                          </TMLButton>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </TMLCardContent>
              </TMLCard>
            </div>
          )}

          {/* Synced Leads Section */}
          <div className="mb-8">
            <TMLCard variant="elevated">
              <TMLCardHeader>
                <TMLCardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Successfully Synced ({syncedLeads.length})
                </TMLCardTitle>
              </TMLCardHeader>
              <TMLCardContent>
                {syncedLeads.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No leads synced yet.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {syncedLeads.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {lead.email} • {lead.practice_area}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          {lead.lead_docket_id && (
                            <p className="text-xs text-gray-500 font-mono">{lead.lead_docket_id}</p>
                          )}
                          {lead.last_sync_attempt_at && (
                            <p className="text-xs text-gray-400">
                              {formatDate(lead.last_sync_attempt_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TMLCardContent>
            </TMLCard>
          </div>

          {/* Pending Syncs Section */}
          {pendingLeads.length > 0 && (
            <TMLCard variant="elevated">
              <TMLCardHeader>
                <TMLCardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                  Pending Sync ({pendingLeads.length})
                </TMLCardTitle>
              </TMLCardHeader>
              <TMLCardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pendingLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {lead.email} • {lead.practice_area}
                        </p>
                      </div>
                      <TMLBadge variant="warning" size="sm">Pending</TMLBadge>
                    </div>
                  ))}
                </div>
              </TMLCardContent>
            </TMLCard>
          )}
        </div>
      </main>

      {selectedError && <ErrorModal error={selectedError} onClose={() => setSelectedError(null)} />}
    </div>
  );
}