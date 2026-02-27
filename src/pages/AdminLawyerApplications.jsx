import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, Eye, Loader2,
  Mail, Phone, Building2, Scale, MapPin, X, Shield,
  ChevronRight, CalendarDays, BadgeCheck, AlertTriangle,
  Users, FileText, ArrowLeft
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLTextarea from '@/components/ui/TMLTextarea';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  variant: 'warning', icon: Clock,         bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle2,  bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200' },
  rejected: { label: 'Rejected', variant: 'danger',  icon: XCircle,       bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
};

const TABS = [
  { value: 'pending',  label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '',         label: 'All' },
];

function StatCard({ label, count, color }) {
  return (
    <div className={`bg-white rounded-xl border px-5 py-4 flex items-center gap-4 ${color}`}>
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
      </div>
    </div>
  );
}

export default function AdminLawyerApplications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [panelAction, setPanelAction] = useState(null); // 'approve' | 'reject'

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [freeTrialMonths, setFreeTrialMonths] = useState('6');
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('Home')); return; }
        const me = await base44.auth.me();
        if (me.role !== 'admin') { navigate(createPageUrl('LawyerDashboard')); return; }
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
    refetchInterval: 30000,
  });

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = applications.filter(app => {
    if (activeTab && app.status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        app.full_name?.toLowerCase().includes(s) ||
        app.email?.toLowerCase().includes(s) ||
        app.firm_name?.toLowerCase().includes(s) ||
        app.bar_number?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('approveLawyerApplication', {
        application_id: selectedApp.id,
        free_trial_months: parseInt(freeTrialMonths) || 0,
      });
      if (res.data?.success) {
        showToast(`${selectedApp.full_name} approved! Activation email sent.`);
        setSelectedApp(null);
        setPanelAction(null);
        refetch();
        queryClient.invalidateQueries(['lawyerApplications']);
      } else {
        showToast(res.data?.error || 'Approval failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error approving application.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendActivation = async (app) => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('resendActivation', { application_id: app.id });
      if (res.data?.success) {
        showToast(`Activation email resent to ${app.email}`);
      } else {
        showToast(res.data?.error || 'Failed to resend.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error resending.', 'error');
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
        showToast(`${selectedApp.full_name}'s application rejected.`);
        setSelectedApp(null);
        setPanelAction(null);
        setRejectionReason('');
        refetch();
        queryClient.invalidateQueries(['lawyerApplications']);
      } else {
        showToast(res.data?.error || 'Rejection failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error rejecting application.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (app) => {
    setSelectedApp(app);
    setPanelAction(null);
    setRejectionReason('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar user={user} currentPage="AdminLawyerApplications" />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 ml-64">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lawyer Approvals</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review and approve lawyers requesting access to the network.</p>
          </div>
          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-md ${
                  toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {toast.msg}
                <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 p-8 overflow-auto">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Applications" count={applications.length} color="border-gray-100" />
            <StatCard label="Pending Review" count={counts.pending || 0} color="border-amber-100" />
            <StatCard label="Approved" count={counts.approved || 0} color="border-emerald-100" />
            <StatCard label="Rejected" count={counts.rejected || 0} color="border-red-100" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            {TABS.map(tab => {
              const cnt = tab.value ? (counts[tab.value] || 0) : applications.length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.value
                      ? 'bg-[#3a164d] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 text-xs ${activeTab === tab.value ? 'opacity-75' : 'text-gray-400'}`}>
                    ({cnt})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-5 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email, firm, bar number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
              <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">
                {activeTab === 'pending' ? 'No lawyers are currently waiting for approval.' : 'No applications found.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicant</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Firm</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">States</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Practice Areas</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Verified</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(app => {
                    const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                    const Icon = sc.icon;
                    return (
                      <motion.tr
                        key={app.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => openDetail(app)}
                      >
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {new Date(app.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{app.full_name}</p>
                          <p className="text-gray-400 text-xs">{app.email}</p>
                        </td>
                        <td className="px-5 py-4 text-gray-700">{app.firm_name}</td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-gray-600">{(app.states_licensed || []).slice(0, 2).join(', ')}{(app.states_licensed || []).length > 2 ? ` +${app.states_licensed.length - 2}` : ''}</span>
                        </td>
                        <td className="px-5 py-4 hidden xl:table-cell">
                          <span className="text-gray-600">{(app.practice_areas || []).slice(0, 2).join(', ')}{(app.practice_areas || []).length > 2 ? ` +${app.practice_areas.length - 2}` : ''}</span>
                        </td>
                        <td className="px-5 py-4">
                          {app.email_verified
                            ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><BadgeCheck className="w-3.5 h-3.5" />Yes</span>
                            : <span className="flex items-center gap-1 text-gray-400 text-xs"><AlertTriangle className="w-3.5 h-3.5" />No</span>
                          }
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                            <Icon className="w-3 h-3" />{sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openDetail(app)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            {app.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => { setSelectedApp(app); setPanelAction('approve'); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => { setSelectedApp(app); setPanelAction('reject'); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Side Panel */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30"
              onClick={() => { setSelectedApp(null); setPanelAction(null); }}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setSelectedApp(null); setPanelAction(null); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg leading-tight">{selectedApp.full_name}</h2>
                    <p className="text-sm text-gray-500">{selectedApp.firm_name}</p>
                  </div>
                </div>
                {(() => {
                  const sc = STATUS_CONFIG[selectedApp.status] || STATUS_CONFIG.pending;
                  const Icon = sc.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>
                      <Icon className="w-3.5 h-3.5" />{sc.label}
                    </span>
                  );
                })()}
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* Applicant Info */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Applicant Info</h3>
                  <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <InfoRow label="Email" value={selectedApp.email} icon={<Mail className="w-3.5 h-3.5" />} />
                    <InfoRow label="Phone" value={selectedApp.phone || '—'} icon={<Phone className="w-3.5 h-3.5" />} />
                    <InfoRow label="Firm" value={selectedApp.firm_name} icon={<Building2 className="w-3.5 h-3.5" />} />
                    <InfoRow label="Bar Number" value={selectedApp.bar_number || '—'} icon={<Scale className="w-3.5 h-3.5" />} />
                    <InfoRow label="Email Verified" value={selectedApp.email_verified ? 'Yes ✓' : 'No'} />
                    <InfoRow label="Submitted" value={new Date(selectedApp.created_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} icon={<CalendarDays className="w-3.5 h-3.5" />} />
                  </div>
                </section>

                {/* Practice Details */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Practice Details</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs mb-1.5">States Licensed</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedApp.states_licensed || []).map(s => (
                          <span key={s} className="bg-white border border-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full">{s}</span>
                        ))}
                        {!(selectedApp.states_licensed || []).length && <span className="text-gray-400">—</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1.5">Practice Areas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedApp.practice_areas || []).map(a => (
                          <span key={a} className="bg-[#f5f0fa] text-[#3a164d] text-xs px-2.5 py-1 rounded-full">{a}</span>
                        ))}
                        {!(selectedApp.practice_areas || []).length && <span className="text-gray-400">—</span>}
                      </div>
                    </div>
                    <InfoRow label="Years of Experience" value={selectedApp.years_experience ? `${selectedApp.years_experience} years` : '—'} />
                  </div>
                </section>

                {/* Bio */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Professional Bio</h3>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedApp.bio || <span className="text-gray-400 italic">No bio provided.</span>}
                  </div>
                </section>

                {/* Referrals */}
                {(selectedApp.referrals || []).length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Referrals Submitted</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      {selectedApp.referrals.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-7 h-7 rounded-full bg-[#3a164d]/10 flex items-center justify-center text-[#3a164d] font-semibold text-xs">{i + 1}</div>
                          <span className="text-gray-700 font-medium">{r.name || '—'}</span>
                          <span className="text-gray-400">{r.email}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Agreements */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Agreements</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {selectedApp.consent_terms
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <XCircle className="w-4 h-4 text-red-400" />}
                      <span className="text-gray-700">Terms &amp; Privacy Policy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedApp.consent_referral
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <XCircle className="w-4 h-4 text-red-400" />}
                      <span className="text-gray-700">Referral Agreement</span>
                    </div>
                  </div>
                </section>

                {/* Reviewer info for non-pending */}
                {selectedApp.reviewed_by && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Review Record</h3>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                      <p className="text-gray-600">Reviewed by <strong>{selectedApp.reviewed_by}</strong></p>
                      {selectedApp.reviewed_at && <p className="text-gray-400 text-xs">{new Date(selectedApp.reviewed_at).toLocaleString()}</p>}
                      {selectedApp.rejection_reason && <p className="text-red-600 mt-2">Reason: {selectedApp.rejection_reason}</p>}
                      {selectedApp.user_created && <p className="text-emerald-600 text-xs mt-1">✓ User account created</p>}
                    </div>
                  </section>
                )}
              </div>

              {/* Sticky action footer */}
              {selectedApp.status === 'pending' && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <AnimatePresence mode="wait">
                    {!panelAction && (
                      <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <TMLButton variant="success" className="flex-1" onClick={() => setPanelAction('approve')}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Lawyer
                        </TMLButton>
                        <TMLButton variant="danger" className="flex-1" onClick={() => setPanelAction('reject')}>
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </TMLButton>
                      </motion.div>
                    )}

                    {panelAction === 'approve' && (
                      <motion.div key="approve" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-800 border border-emerald-100">
                          <p className="font-semibold mb-1">Confirm Approval</p>
                          <p>This will send an activation email to <strong>{selectedApp.email}</strong> with a link to set their password.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600 whitespace-nowrap">Free Trial:</label>
                          <select
                            value={freeTrialMonths}
                            onChange={e => setFreeTrialMonths(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20"
                          >
                            <option value="0">No trial</option>
                            <option value="1">1 month</option>
                            <option value="3">3 months</option>
                            <option value="6">6 months (default)</option>
                            <option value="12">12 months</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <TMLButton variant="success" className="flex-1" loading={actionLoading} onClick={handleApprove}>
                            Confirm Approval
                          </TMLButton>
                          <TMLButton variant="ghost" onClick={() => setPanelAction(null)}>Cancel</TMLButton>
                        </div>
                      </motion.div>
                    )}

                    {panelAction === 'reject' && (
                      <motion.div key="reject" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <TMLTextarea
                          label="Rejection Reason (optional)"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          placeholder="Provide a reason — will be included in the rejection email..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <TMLButton variant="danger" className="flex-1" loading={actionLoading} onClick={handleReject}>
                            Confirm Rejection
                          </TMLButton>
                          <TMLButton variant="ghost" onClick={() => setPanelAction(null)}>Cancel</TMLButton>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Quick action modals (from table row buttons, not panel) */}
      <AnimatePresence>
        {selectedApp && panelAction && !selectedApp.status !== 'pending' && panelAction !== null && !selectedApp && (
          <div /> /* handled in side panel */
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">{icon}{label}</p>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}