import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, Eye, Loader2,
  Mail, Phone, Building2, Scale, MapPin, X
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', variant: 'danger', icon: XCircle },
};

export default function AdminLawyerApplications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [action, setAction] = useState(null); // 'approve' | 'reject'
  const [actionLoading, setActionLoading] = useState(false);
  const [freeTrialMonths, setFreeTrialMonths] = useState('6');
  const [rejectionReason, setRejectionReason] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('Home')); return; }
        const me = await base44.auth.me();
        if (me.role !== 'admin') { navigate(createPageUrl('Home')); return; }
        setUser(me);
      } catch { navigate(createPageUrl('Home')); }
      finally { setAuthLoading(false); }
    };
    checkAuth();
  }, [navigate]);

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['lawyerApplications'],
    queryFn: () => base44.entities.LawyerApplication.list('-created_date'),
    enabled: !!user,
  });

  const filtered = applications.filter(app => {
    if (statusFilter && app.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return app.full_name?.toLowerCase().includes(s) || app.email?.toLowerCase().includes(s) || app.firm_name?.toLowerCase().includes(s);
    }
    return true;
  });

  const counts = applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('approveLawyerApplication', {
        application_id: selectedApp.id,
        free_trial_months: parseInt(freeTrialMonths) || 0,
      });
      if (res.data?.success) {
        setSuccess(`${selectedApp.full_name} approved! Activation email sent.`);
        setSelectedApp(null);
        setAction(null);
        refetch();
        queryClient.invalidateQueries(['lawyerApplications']);
      }
    } catch (err) {
      setSuccess('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('rejectLawyerApplication', {
        application_id: selectedApp.id,
        rejection_reason: rejectionReason,
      });
      if (res.data?.success) {
        setSuccess(`${selectedApp.full_name}'s application rejected.`);
        setSelectedApp(null);
        setAction(null);
        setRejectionReason('');
        refetch();
        queryClient.invalidateQueries(['lawyerApplications']);
      }
    } catch (err) {
      setSuccess('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex">
      <AdminSidebar user={user} currentPage="AdminLawyerApplications" />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lawyer Applications</h1>
              <p className="text-sm text-gray-500">Review and approve attorney applications</p>
            </div>
            {success && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${success.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {success.startsWith('Error') ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {success}
                <button onClick={() => setSuccess('')}><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {/* Quick filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { value: '', label: 'All', count: applications.length },
              { value: 'pending', label: 'Pending', count: counts.pending || 0 },
              { value: 'approved', label: 'Approved', count: counts.approved || 0 },
              { value: 'rejected', label: 'Rejected', count: counts.rejected || 0 },
            ].map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${statusFilter === f.value ? 'bg-[#3a164d] text-white border-[#3a164d]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#3a164d]'}`}>
                {f.label} <span className="ml-1 opacity-70">({f.count})</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, firm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
            />
          </div>

          {/* Applications list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No applications found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(app => {
                const s = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                const Icon = s.icon;
                return (
                  <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <TMLCard variant="elevated" className="hover:shadow-md transition-shadow">
                      <TMLCardContent>
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-bold text-gray-900 text-lg">{app.full_name}</h3>
                              <TMLBadge variant={s.variant}><Icon className="w-3 h-3 mr-1" />{s.label}</TMLBadge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{app.email}</span>
                              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{app.firm_name}</span>
                              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{app.phone}</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{(app.states_licensed || []).length} states</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(app.practice_areas || []).slice(0, 4).map(pa => (
                                <span key={pa} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{pa}</span>
                              ))}
                              {(app.practice_areas || []).length > 4 && <span className="text-xs text-gray-400">+{app.practice_areas.length - 4} more</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Applied: {new Date(app.created_date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <TMLButton variant="ghost" size="sm" onClick={() => { setSelectedApp(app); setAction('view'); }}>
                              <Eye className="w-4 h-4 mr-1" /> View
                            </TMLButton>
                            {app.status === 'pending' && (
                              <>
                                <TMLButton variant="success" size="sm" onClick={() => { setSelectedApp(app); setAction('approve'); }}>
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                                </TMLButton>
                                <TMLButton variant="danger" size="sm" onClick={() => { setSelectedApp(app); setAction('reject'); }}>
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </TMLButton>
                              </>
                            )}
                          </div>
                        </div>
                      </TMLCardContent>
                    </TMLCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail / Action Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setSelectedApp(null); setAction(null); }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">{selectedApp.full_name}</h2>
              <button onClick={() => { setSelectedApp(null); setAction(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Email', selectedApp.email],
                  ['Firm', selectedApp.firm_name],
                  ['Phone', selectedApp.phone],
                  ['Bar #', selectedApp.bar_number],
                  ['Experience', `${selectedApp.years_experience} years`],
                  ['Status', selectedApp.status],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-gray-400 text-xs font-medium uppercase mb-0.5">{label}</p>
                    <p className="text-gray-900 font-medium">{val}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase mb-1">States Licensed</p>
                <p className="text-gray-700 text-sm">{(selectedApp.states_licensed || []).join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase mb-1">Practice Areas</p>
                <p className="text-gray-700 text-sm">{(selectedApp.practice_areas || []).join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase mb-1">Bio</p>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedApp.bio || '—'}</p>
              </div>

              {/* Actions */}
              {selectedApp.status === 'pending' && (
                <div className="border-t pt-5 space-y-4">
                  {action === 'approve' && (
                    <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                      <h3 className="font-semibold text-emerald-800">Approve Application</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Free Trial Months</label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={freeTrialMonths}
                          onChange={e => setFreeTrialMonths(e.target.value)}
                          className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Set to 0 for no trial period.</p>
                      </div>
                      <p className="text-sm text-emerald-700">An activation email will be sent with a password setup link.</p>
                      <div className="flex gap-2">
                        <TMLButton variant="success" loading={actionLoading} onClick={handleApprove}>
                          Confirm Approval
                        </TMLButton>
                        <TMLButton variant="ghost" onClick={() => setAction(null)}>Cancel</TMLButton>
                      </div>
                    </div>
                  )}

                  {action === 'reject' && (
                    <div className="bg-red-50 rounded-xl p-4 space-y-3">
                      <h3 className="font-semibold text-red-800">Reject Application</h3>
                      <TMLTextarea
                        label="Rejection Reason (optional)"
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Provide a reason (will be included in rejection email)..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <TMLButton variant="danger" loading={actionLoading} onClick={handleReject}>
                          Confirm Rejection
                        </TMLButton>
                        <TMLButton variant="ghost" onClick={() => setAction(null)}>Cancel</TMLButton>
                      </div>
                    </div>
                  )}

                  {action === 'view' && (
                    <div className="flex gap-2">
                      <TMLButton variant="success" size="sm" onClick={() => setAction('approve')}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                      </TMLButton>
                      <TMLButton variant="danger" size="sm" onClick={() => setAction('reject')}>
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </TMLButton>
                    </div>
                  )}
                </div>
              )}

              {selectedApp.status === 'approved' && (
                <div className="bg-emerald-50 rounded-lg p-4 text-sm text-emerald-700">
                  <p><strong>Approved</strong> by {selectedApp.reviewed_by} on {new Date(selectedApp.reviewed_at).toLocaleDateString()}</p>
                  <p className="text-xs mt-1">{selectedApp.user_created ? 'User account created.' : 'Awaiting password activation.'}</p>
                </div>
              )}

              {selectedApp.status === 'rejected' && (
                <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700">
                  <p><strong>Rejected</strong> by {selectedApp.reviewed_by}</p>
                  {selectedApp.rejection_reason && <p className="mt-1">Reason: {selectedApp.rejection_reason}</p>}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}