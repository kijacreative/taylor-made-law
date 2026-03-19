/**
 * AdminApplications — Review queue for publicly-signed-up lawyers.
 * Route: /admin/applications
 *
 * Shows LawyerApplication records with status = 'active_pending_review'
 * Actions: Mark Reviewed (→ active), Request More Info, Disable Lawyer
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Clock, XCircle, Mail, Loader2, Search,
  ChevronDown, ChevronUp, User, AlertTriangle, Filter
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

const STATUS_CONFIG = {
  active_pending_review: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800 border border-amber-200' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border border-red-200' },
  disabled: { label: 'Disabled', color: 'bg-gray-100 text-gray-600 border border-gray-200' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>;
};

export default function AdminApplications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active_pending_review');
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [infoModal, setInfoModal] = useState(null); // { appId, email }
  const [infoMessage, setInfoMessage] = useState('');
  const [disableModal, setDisableModal] = useState(null); // { appId, email, name }
  const [disableReason, setDisableReason] = useState('');

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (!auth) { navigate('/login'); return; }
      try {
        const u = await base44.auth.me();
        if (u.role !== 'admin') { navigate('/LawyerDashboard'); return; }
        setUser(u);
      } catch { navigate('/login'); }
      finally { setLoadingAuth(false); }
    });
  }, []);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['lawyerApplications'],
    queryFn: () => base44.entities.LawyerApplication.list('-created_date', 100),
    enabled: !!user,
  });

  const { data: lawyerProfiles = [] } = useQuery({
    queryKey: ['lawyerProfilesForApps'],
    queryFn: () => base44.entities.LawyerProfile.list('-created_date', 200),
    enabled: !!user,
  });

  const profileByEmail = useMemo(() => {
    const map = {};
    lawyerProfiles.forEach(p => { if (p.user_id) map[p.user_id] = p; });
    return map;
  }, [lawyerProfiles]);

  const filtered = applications.filter(app => {
    const matchStatus = !statusFilter || statusFilter === 'all' || app.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      app.full_name?.toLowerCase().includes(q) ||
      app.email?.toLowerCase().includes(q) ||
      app.firm_name?.toLowerCase().includes(q) ||
      app.bar_number?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    all: applications.length,
    active_pending_review: applications.filter(a => a.status === 'active_pending_review').length,
    active: applications.filter(a => a.status === 'active').length,
    disabled: applications.filter(a => a.status === 'disabled' || a.status === 'rejected').length,
  };

  const runAction = async (action, appId, payload = {}) => {
    setActionLoading(prev => ({ ...prev, [appId]: action }));
    try {
      const res = await base44.functions.invoke('reviewLawyerApplication', { action, application_id: appId, ...payload });
      if (!res.data?.success) throw new Error(res.data?.error || 'Action failed');
      queryClient.invalidateQueries(['lawyerApplications']);
    } finally {
      setActionLoading(prev => ({ ...prev, [appId]: null }));
    }
  };

  const handleApprove = (app) => runAction('approve', app.id, { email: app.email, name: app.full_name });

  const handleRequestInfo = async () => {
    if (!infoModal) return;
    await runAction('request_info', infoModal.appId, { email: infoModal.email, message: infoMessage });
    setInfoModal(null);
    setInfoMessage('');
  };

  const handleDisable = async () => {
    if (!disableModal) return;
    await runAction('disable', disableModal.appId, { email: disableModal.email, name: disableModal.name, reason: disableReason });
    setDisableModal(null);
    setDisableReason('');
  };

  if (loadingAuth) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar user={user} />
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Attorney Applications</h1>
            <p className="text-gray-600 mt-1">Review and manage lawyer applications from public signup.</p>
          </div>

          {/* Status tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { key: 'active_pending_review', label: 'Pending Review', count: counts.active_pending_review },
              { key: 'active', label: 'Active', count: counts.active },
              { key: 'disabled', label: 'Disabled', count: counts.disabled },
              { key: 'all', label: 'All', count: counts.all },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${statusFilter === tab.key ? 'bg-[#3a164d] text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
                {tab.label}
                <span className={`text-xs rounded-full px-2 py-0.5 ${statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, firm, or bar number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d] bg-white"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
          ) : filtered.length === 0 ? (
            <TMLCard className="text-center py-16">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No applications found.</p>
            </TMLCard>
          ) : (
            <div className="space-y-3">
              {filtered.map(app => {
                const isExpanded = expandedId === app.id;
                const loading = actionLoading[app.id];
                const onboarded = !!app.billing_demo_status;
                const referralDone = !!app.consent_referral;

                return (
                  <TMLCard key={app.id} variant="elevated" className="overflow-hidden">
                    {/* Row header */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#3a164d]/10 flex items-center justify-center text-[#3a164d] font-bold shrink-0">
                        {app.full_name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{app.full_name}</span>
                          <StatusBadge status={app.status} />
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>{app.email}</span>
                          <span>•</span>
                          <span>{app.firm_name}</span>
                          {app.bar_number && <><span>•</span><span>Bar: {app.bar_number}</span></>}
                        </div>
                      </div>
                      {/* Profile completion indicators */}
                      <div className="hidden md:flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-xs">
                          {referralDone
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                          <span className="text-gray-500">Agreement</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {onboarded
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                          <span className="text-gray-500">Billing</span>
                        </div>
                      </div>
                      {/* Actions (pending only) */}
                      {app.status === 'active_pending_review' && (
                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleApprove(app)}
                            disabled={!!loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                            {loading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Approve
                          </button>
                          <button
                            onClick={() => setInfoModal({ appId: app.id, email: app.email })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
                            <Mail className="w-3 h-3" /> Info
                          </button>
                          <button
                            onClick={() => setDisableModal({ appId: app.id, email: app.email, name: app.full_name })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
                            <XCircle className="w-3 h-3" /> Disable
                          </button>
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-gray-100"
                        >
                          <div className="p-5 bg-gray-50 grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">States Licensed</p>
                              <p className="text-gray-800">{app.states_licensed?.join(', ') || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Practice Areas</p>
                              <p className="text-gray-800">{app.practice_areas?.join(', ') || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Years Experience</p>
                              <p className="text-gray-800">{app.years_experience ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Referral Agreement</p>
                              <p className={referralDone ? 'text-emerald-700 font-medium' : 'text-amber-600'}>{referralDone ? 'Accepted' : 'Not accepted'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Billing Setup</p>
                              <p className={onboarded ? 'text-emerald-700 font-medium' : 'text-amber-600'}>{onboarded ? 'Completed' : 'Pending'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Applied</p>
                              <p className="text-gray-800">{app.created_date ? new Date(app.created_date).toLocaleDateString() : '—'}</p>
                            </div>
                            {app.bio && (
                              <div className="md:col-span-2 lg:col-span-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Bio</p>
                                <p className="text-gray-700 text-sm leading-relaxed">{app.bio}</p>
                              </div>
                            )}
                            {app.rejection_reason && (
                              <div className="md:col-span-2 lg:col-span-3">
                                <p className="text-xs font-semibold text-red-400 uppercase mb-1">Rejection / Disable Reason</p>
                                <p className="text-red-700 text-sm">{app.rejection_reason}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TMLCard>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Request More Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setInfoModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Request More Information</h3>
            <p className="text-sm text-gray-500 mb-4">An email will be sent to <strong>{infoModal.email}</strong>.</p>
            <textarea
              rows={4}
              value={infoMessage}
              onChange={e => setInfoMessage(e.target.value)}
              placeholder="Describe what additional information or documentation you need from this attorney..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d] resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setInfoModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <TMLButton variant="primary" size="sm" onClick={handleRequestInfo} disabled={!infoMessage.trim()}>Send Request</TMLButton>
            </div>
          </div>
        </div>
      )}

      {/* Disable Lawyer Modal */}
      {disableModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDisableModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Disable Account</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will block <strong>{disableModal.name}</strong> from logging in and send them a notification email.
            </p>
            <textarea
              rows={3}
              value={disableReason}
              onChange={e => setDisableReason(e.target.value)}
              placeholder="Reason for disabling this account (will be included in notification email)..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDisableModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <TMLButton variant="danger" size="sm" onClick={handleDisable}>Disable Account</TMLButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}