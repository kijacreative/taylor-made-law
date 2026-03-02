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
  Users, FileText, ArrowLeft, Send
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLTextarea from '@/components/ui/TMLTextarea';

// ── Applications config ──────────────────────────────────────────────────────
const APP_STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: Clock,        bg: 'bg-amber-50',   text: 'text-amber-700' },
  approved: { label: 'Approved', icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { label: 'Rejected', icon: XCircle,      bg: 'bg-red-50',     text: 'text-red-700' },
};
const APP_TABS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '',         label: 'All' },
];

// ── Network Review config ────────────────────────────────────────────────────
const REVIEW_CONFIG = {
  pending:  { label: 'Pending Review', bg: 'bg-amber-50',   text: 'text-amber-700' },
  verified: { label: 'Verified',       bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { label: 'Rejected',       bg: 'bg-red-50',     text: 'text-red-700' },
};
const REVIEW_TABS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: '',         label: 'All' },
];

// ── Main Sections ────────────────────────────────────────────────────────────
const SECTIONS = [
  { value: 'applications', label: 'Applications' },
  { value: 'network',      label: 'Network Review' },
];

function InfoRow({ label, value, icon }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">{icon}{label}</p>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}

export default function AdminLawyerApplications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Section toggle
  const [section, setSection] = useState('applications');

  // Shared UI state
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Applications state
  const [appTab, setAppTab] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [appPanelAction, setAppPanelAction] = useState(null);
  const [freeTrialMonths, setFreeTrialMonths] = useState('6');
  const [appRejectionReason, setAppRejectionReason] = useState('');

  // Network review state
  const [reviewTab, setReviewTab] = useState('pending');
  const [selectedUser, setSelectedUser] = useState(null);
  const [reviewPanelAction, setReviewPanelAction] = useState(null);
  const [reviewRejectionReason, setReviewRejectionReason] = useState('');

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

  // Applications data
  const { data: applications = [], isLoading: appsLoading, refetch: refetchApps } = useQuery({
    queryKey: ['lawyerApplications'],
    queryFn: () => base44.entities.LawyerApplication.list('-created_date'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Network lawyers data
  const { data: allUsers = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['networkLawyers'],
    queryFn: async () => {
      const users = await base44.entities.User.list('-created_date');
      return users.filter(u => u.role !== 'admin');
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // ── Applications filtering ─────────────────────────────────────────────────
  const appCounts = applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  const filteredApps = applications.filter(app => {
    if (appTab && app.status !== appTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return app.full_name?.toLowerCase().includes(s) || app.email?.toLowerCase().includes(s) ||
        app.firm_name?.toLowerCase().includes(s) || app.bar_number?.toLowerCase().includes(s);
    }
    return true;
  });

  // ── Network Review filtering ───────────────────────────────────────────────
  const reviewCounts = allUsers.reduce((acc, u) => { const rs = u.review_status || 'pending'; acc[rs] = (acc[rs] || 0) + 1; return acc; }, {});
  const filteredUsers = allUsers.filter(u => {
    if (reviewTab && (u.review_status || 'pending') !== reviewTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) ||
        u.firm_name?.toLowerCase().includes(s) || u.bar_number?.toLowerCase().includes(s);
    }
    return true;
  });

  // ── Application actions ────────────────────────────────────────────────────
  const handleAppApprove = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('approveLawyerApplication', {
        application_id: selectedApp.id,
        free_trial_months: parseInt(freeTrialMonths) || 0,
      });
      if (res.data?.success) {
        showToast(`${selectedApp.full_name} approved! Activation email sent.`);
        setSelectedApp(null); setAppPanelAction(null);
        refetchApps(); queryClient.invalidateQueries(['lawyerApplications']);
      } else { showToast(res.data?.error || 'Approval failed.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message || 'Error approving.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleAppReject = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('rejectLawyerApplication', {
        application_id: selectedApp.id,
        rejection_reason: appRejectionReason,
      });
      if (res.data?.success) {
        showToast(`${selectedApp.full_name}'s application rejected.`);
        setSelectedApp(null); setAppPanelAction(null); setAppRejectionReason('');
        refetchApps(); queryClient.invalidateQueries(['lawyerApplications']);
      } else { showToast(res.data?.error || 'Rejection failed.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message || 'Error rejecting.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleResendActivation = async (app) => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('resendActivation', { application_id: app.id });
      if (res.data?.success) showToast(`Activation email resent to ${app.email}`);
      else showToast(res.data?.error || 'Failed to resend.', 'error');
    } catch (err) { showToast(err.response?.data?.error || err.message || 'Error resending.', 'error'); }
    finally { setActionLoading(false); }
  };

  // ── Network Review actions ─────────────────────────────────────────────────
  const handleVerify = async () => {
    setActionLoading(true);
    try {
      await base44.entities.User.update(selectedUser.id, { review_status: 'verified' });
      await base44.entities.AuditLog.create({
        entity_type: 'User', entity_id: selectedUser.id, action: 'lawyer_verified',
        actor_email: user.email, actor_role: 'admin', notes: `Bar number verified by ${user.email}`
      });
      showToast(`${selectedUser.full_name || selectedUser.email} marked as verified.`);
      setSelectedUser(null); setReviewPanelAction(null);
      refetchUsers(); queryClient.invalidateQueries(['networkLawyers']);
    } catch (err) { showToast(err.message || 'Verification failed.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleReviewReject = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('rejectLawyer', {
        user_id: selectedUser.id, rejection_reason: reviewRejectionReason,
      });
      if (res.data?.success) {
        showToast(`${selectedUser.full_name || selectedUser.email} rejected and disabled.`);
        setSelectedUser(null); setReviewPanelAction(null); setReviewRejectionReason('');
        refetchUsers(); queryClient.invalidateQueries(['networkLawyers']);
      } else { showToast(res.data?.error || 'Rejection failed.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message || 'Error rejecting.', 'error'); }
    finally { setActionLoading(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  const isLoading = section === 'applications' ? appsLoading : usersLoading;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar user={user} currentPage="AdminLawyerApplications" />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lawyer Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {section === 'applications' ? 'Review and approve lawyers requesting access to the network.' : 'Review auto-approved attorneys. Verify bar numbers or remove access.'}
            </p>
          </div>
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
          {/* Section Toggle */}
          <div className="flex gap-1 mb-8 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            {SECTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => { setSection(s.value); setSearch(''); }}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  section === s.value ? 'bg-[#3a164d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s.label}
                {s.value === 'applications' && appCounts.pending > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center">{appCounts.pending}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── APPLICATIONS SECTION ── */}
          {section === 'applications' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total', count: applications.length, color: 'border-gray-100' },
                  { label: 'Pending', count: appCounts.pending || 0, color: 'border-amber-100' },
                  { label: 'Approved', count: appCounts.approved || 0, color: 'border-emerald-100' },
                  { label: 'Rejected', count: appCounts.rejected || 0, color: 'border-red-100' },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl border px-5 py-4 ${s.color}`}>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                {APP_TABS.map(tab => {
                  const cnt = tab.value ? (appCounts[tab.value] || 0) : applications.length;
                  return (
                    <button key={tab.value} onClick={() => setAppTab(tab.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${appTab === tab.value ? 'bg-[#3a164d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                      {tab.label} <span className={`ml-1.5 text-xs ${appTab === tab.value ? 'opacity-75' : 'text-gray-400'}`}>({cnt})</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative mb-5 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search name, email, firm, bar number..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]" />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
                  <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No applications found.</p>
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
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Verified</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredApps.map(app => {
                        const sc = APP_STATUS_CONFIG[app.status] || APP_STATUS_CONFIG.pending;
                        const Icon = sc.icon;
                        return (
                          <motion.tr key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => { setSelectedApp(app); setAppPanelAction(null); setAppRejectionReason(''); }}>
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">{new Date(app.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="px-5 py-4"><p className="font-semibold text-gray-900">{app.full_name}</p><p className="text-gray-400 text-xs">{app.email}</p></td>
                            <td className="px-5 py-4 text-gray-700">{app.firm_name}</td>
                            <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">{(app.states_licensed || []).slice(0, 2).join(', ')}{(app.states_licensed || []).length > 2 ? ` +${app.states_licensed.length - 2}` : ''}</td>
                            <td className="px-5 py-4">
                              {app.email_verified
                                ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><BadgeCheck className="w-3.5 h-3.5" />Yes</span>
                                : <span className="flex items-center gap-1 text-gray-400 text-xs"><AlertTriangle className="w-3.5 h-3.5" />No</span>}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                                <Icon className="w-3 h-3" />{sc.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setSelectedApp(app); setAppPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100"><Eye className="w-4 h-4" /></button>
                                {app.status === 'approved' && (
                                  <button onClick={() => handleResendActivation(app)} disabled={actionLoading}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1">
                                    <Send className="w-3 h-3" /> Resend
                                  </button>
                                )}
                                {app.status === 'pending' && (
                                  <>
                                    <button onClick={() => { setSelectedApp(app); setAppPanelAction('approve'); }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Approve</button>
                                    <button onClick={() => { setSelectedApp(app); setAppPanelAction('reject'); }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100">Reject</button>
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
            </>
          )}

          {/* ── NETWORK REVIEW SECTION ── */}
          {section === 'network' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Attorneys', count: allUsers.length, color: 'border-gray-100' },
                  { label: 'Pending Review', count: reviewCounts.pending || 0, color: 'border-amber-100' },
                  { label: 'Verified', count: reviewCounts.verified || 0, color: 'border-emerald-100' },
                  { label: 'Rejected', count: reviewCounts.rejected || 0, color: 'border-red-100' },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl border px-5 py-4 ${s.color}`}>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                {REVIEW_TABS.map(tab => {
                  const cnt = tab.value ? (reviewCounts[tab.value] || 0) : allUsers.length;
                  return (
                    <button key={tab.value} onClick={() => setReviewTab(tab.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${reviewTab === tab.value ? 'bg-[#3a164d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                      {tab.label} <span className={`ml-1.5 text-xs ${reviewTab === tab.value ? 'opacity-75' : 'text-gray-400'}`}>({cnt})</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative mb-5 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search name, email, firm, bar number..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]" />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No attorneys found.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Added</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attorney</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Firm / Bar #</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">States</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Referral Agmt</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Review Status</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map(u => {
                        const rs = u.review_status || 'pending';
                        const rc = REVIEW_CONFIG[rs] || REVIEW_CONFIG.pending;
                        return (
                          <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => { setSelectedUser(u); setReviewPanelAction(null); setReviewRejectionReason(''); }}>
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">{new Date(u.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="px-5 py-4"><p className="font-semibold text-gray-900">{u.full_name || '—'}</p><p className="text-gray-400 text-xs">{u.email}</p></td>
                            <td className="px-5 py-4"><p className="text-gray-700">{u.firm_name || '—'}</p><p className="text-gray-400 text-xs">{u.bar_number || 'No bar #'}</p></td>
                            <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">{(u.states_licensed || []).slice(0, 3).join(', ')}{(u.states_licensed || []).length > 3 ? ` +${u.states_licensed.length - 3}` : ''}</td>
                            <td className="px-5 py-4">
                              {u.referral_agreement_accepted
                                ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Accepted</span>
                                : <span className="flex items-center gap-1 text-amber-500 text-xs"><Clock className="w-3.5 h-3.5" />Pending</span>}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>{rc.label}</span>
                            </td>
                            <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setSelectedUser(u); setReviewPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100"><Eye className="w-4 h-4" /></button>
                                {rs !== 'verified' && rs !== 'rejected' && (
                                  <>
                                    <button onClick={() => { setSelectedUser(u); setReviewPanelAction('verify'); }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Verify</button>
                                    <button onClick={() => { setSelectedUser(u); setReviewPanelAction('reject'); }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100">Reject</button>
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
            </>
          )}
        </div>
      </div>

      {/* ── APPLICATION DETAIL PANEL ── */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30" onClick={() => { setSelectedApp(null); setAppPanelAction(null); }} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedApp(null); setAppPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
                  <div><h2 className="font-bold text-gray-900 text-lg leading-tight">{selectedApp.full_name}</h2><p className="text-sm text-gray-500">{selectedApp.firm_name}</p></div>
                </div>
                {(() => { const sc = APP_STATUS_CONFIG[selectedApp.status] || APP_STATUS_CONFIG.pending; const Icon = sc.icon; return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${sc.bg} ${sc.text}`}><Icon className="w-3.5 h-3.5" />{sc.label}</span>; })()}
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
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
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Practice Details</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs mb-1.5">States Licensed</p>
                      <div className="flex flex-wrap gap-1.5">{(selectedApp.states_licensed || []).map(s => <span key={s} className="bg-white border border-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full">{s}</span>)}{!(selectedApp.states_licensed || []).length && <span className="text-gray-400">—</span>}</div>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1.5">Practice Areas</p>
                      <div className="flex flex-wrap gap-1.5">{(selectedApp.practice_areas || []).map(a => <span key={a} className="bg-[#f5f0fa] text-[#3a164d] text-xs px-2.5 py-1 rounded-full">{a}</span>)}{!(selectedApp.practice_areas || []).length && <span className="text-gray-400">—</span>}</div>
                    </div>
                    <InfoRow label="Years of Experience" value={selectedApp.years_experience ? `${selectedApp.years_experience} years` : '—'} />
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Professional Bio</h3>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedApp.bio || <span className="text-gray-400 italic">No bio provided.</span>}</div>
                </section>
                {(selectedApp.referrals || []).length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Referrals</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">{selectedApp.referrals.map((r, i) => <div key={i} className="flex items-center gap-3 text-sm"><div className="w-7 h-7 rounded-full bg-[#3a164d]/10 flex items-center justify-center text-[#3a164d] font-semibold text-xs">{i + 1}</div><span className="text-gray-700 font-medium">{r.name || '—'}</span><span className="text-gray-400">{r.email}</span></div>)}</div>
                  </section>
                )}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Agreements</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">{selectedApp.consent_terms ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-400" />}<span className="text-gray-700">Terms &amp; Privacy Policy</span></div>
                    <div className="flex items-center gap-2">{selectedApp.consent_referral ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-400" />}<span className="text-gray-700">Referral Agreement</span></div>
                  </div>
                </section>
                {selectedApp.reviewed_by && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Review Record</h3>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                      <p className="text-gray-600">Reviewed by <strong>{selectedApp.reviewed_by}</strong></p>
                      {selectedApp.reviewed_at && <p className="text-gray-400 text-xs">{new Date(selectedApp.reviewed_at).toLocaleString()}</p>}
                      {selectedApp.rejection_reason && <p className="text-red-600 mt-2">Reason: {selectedApp.rejection_reason}</p>}
                    </div>
                  </section>
                )}
              </div>
              {selectedApp.status === 'approved' && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <TMLButton variant="info" className="w-full" loading={actionLoading} onClick={() => handleResendActivation(selectedApp)}>
                    <Send className="w-4 h-4 mr-2" /> Resend Activation Email
                  </TMLButton>
                </div>
              )}
              {selectedApp.status === 'pending' && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <AnimatePresence mode="wait">
                    {!appPanelAction && (
                      <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <TMLButton variant="success" className="flex-1" onClick={() => setAppPanelAction('approve')}><CheckCircle2 className="w-4 h-4 mr-2" /> Approve</TMLButton>
                        <TMLButton variant="danger" className="flex-1" onClick={() => setAppPanelAction('reject')}><XCircle className="w-4 h-4 mr-2" /> Reject</TMLButton>
                      </motion.div>
                    )}
                    {appPanelAction === 'approve' && (
                      <motion.div key="approve" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-800 border border-emerald-100">
                          <p className="font-semibold mb-1">Confirm Approval</p>
                          <p>This will send an activation email to <strong>{selectedApp.email}</strong>.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600 whitespace-nowrap">Free Trial:</label>
                          <select value={freeTrialMonths} onChange={e => setFreeTrialMonths(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20">
                            <option value="0">No trial</option>
                            <option value="1">1 month</option>
                            <option value="3">3 months</option>
                            <option value="6">6 months (default)</option>
                            <option value="12">12 months</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <TMLButton variant="success" className="flex-1" loading={actionLoading} onClick={handleAppApprove}>Confirm Approval</TMLButton>
                          <TMLButton variant="ghost" onClick={() => setAppPanelAction(null)}>Cancel</TMLButton>
                        </div>
                      </motion.div>
                    )}
                    {appPanelAction === 'reject' && (
                      <motion.div key="reject" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <TMLTextarea label="Rejection Reason (optional)" value={appRejectionReason} onChange={e => setAppRejectionReason(e.target.value)} placeholder="Provide a reason..." rows={3} />
                        <div className="flex gap-2">
                          <TMLButton variant="danger" className="flex-1" loading={actionLoading} onClick={handleAppReject}>Confirm Rejection</TMLButton>
                          <TMLButton variant="ghost" onClick={() => setAppPanelAction(null)}>Cancel</TMLButton>
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

      {/* ── NETWORK REVIEW DETAIL PANEL ── */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30" onClick={() => { setSelectedUser(null); setReviewPanelAction(null); }} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedUser(null); setReviewPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
                  <div><h2 className="font-bold text-gray-900 text-lg leading-tight">{selectedUser.full_name || selectedUser.email}</h2><p className="text-sm text-gray-500">{selectedUser.firm_name || '—'}</p></div>
                </div>
                {(() => { const rs = selectedUser.review_status || 'pending'; const rc = REVIEW_CONFIG[rs] || REVIEW_CONFIG.pending; return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${rc.bg} ${rc.text}`}>{rc.label}</span>; })()}
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attorney Info</h3>
                  <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />Email</p><p className="font-medium text-gray-900">{selectedUser.email}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</p><p className="font-medium text-gray-900">{selectedUser.phone || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />Firm</p><p className="font-medium text-gray-900">{selectedUser.firm_name || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Scale className="w-3 h-3" />Bar #</p><p className="font-medium text-gray-900">{selectedUser.bar_number || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5">Account Status</p><p className="font-medium text-gray-900">{selectedUser.user_status || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5">Joined</p><p className="font-medium text-gray-900">{new Date(selectedUser.created_date).toLocaleDateString()}</p></div>
                  </div>
                </section>
                {(selectedUser.states_licensed?.length > 0 || selectedUser.practice_areas?.length > 0) && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Practice</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                      {selectedUser.states_licensed?.length > 0 && <div><p className="text-xs text-gray-400 mb-1.5">States Licensed</p><div className="flex flex-wrap gap-1.5">{selectedUser.states_licensed.map(s => <span key={s} className="bg-white border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{s}</span>)}</div></div>}
                      {selectedUser.practice_areas?.length > 0 && <div><p className="text-xs text-gray-400 mb-1.5">Practice Areas</p><div className="flex flex-wrap gap-1.5">{selectedUser.practice_areas.map(a => <span key={a} className="bg-[#f5f0fa] text-[#3a164d] text-xs px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
                    </div>
                  </section>
                )}
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Agreement & Profile</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">{selectedUser.referral_agreement_accepted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}<span className="text-gray-700">Referral Agreement Accepted</span></div>
                    <div className="flex items-center gap-2">{selectedUser.profile_completed_at ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}<span className="text-gray-700">Profile Completed</span></div>
                  </div>
                </section>
                {selectedUser.disabled_by && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rejection Record</h3>
                    <div className="bg-red-50 rounded-xl p-4 text-sm">
                      <p className="text-red-700">Rejected by <strong>{selectedUser.disabled_by}</strong></p>
                      {selectedUser.disabled_at && <p className="text-red-400 text-xs">{new Date(selectedUser.disabled_at).toLocaleString()}</p>}
                      {selectedUser.disabled_reason && <p className="text-red-600 mt-2">Reason: {selectedUser.disabled_reason}</p>}
                    </div>
                  </section>
                )}
              </div>
              {(selectedUser.review_status === 'pending' || !selectedUser.review_status) && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <AnimatePresence mode="wait">
                    {!reviewPanelAction && (
                      <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <TMLButton variant="success" className="flex-1" onClick={() => setReviewPanelAction('verify')}><BadgeCheck className="w-4 h-4 mr-2" /> Mark Verified</TMLButton>
                        <TMLButton variant="danger" className="flex-1" onClick={() => setReviewPanelAction('reject')}><XCircle className="w-4 h-4 mr-2" /> Reject & Disable</TMLButton>
                      </motion.div>
                    )}
                    {reviewPanelAction === 'verify' && (
                      <motion.div key="verify" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-800 border border-emerald-100">
                          <p className="font-semibold mb-1">Confirm Verification</p>
                          <p>Mark <strong>{selectedUser.full_name || selectedUser.email}</strong> as verified.</p>
                        </div>
                        <div className="flex gap-2">
                          <TMLButton variant="success" className="flex-1" loading={actionLoading} onClick={handleVerify}>Confirm Verification</TMLButton>
                          <TMLButton variant="ghost" onClick={() => setReviewPanelAction(null)}>Cancel</TMLButton>
                        </div>
                      </motion.div>
                    )}
                    {reviewPanelAction === 'reject' && (
                      <motion.div key="reject" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-red-50 rounded-xl text-sm text-red-800 border border-red-100">
                          <p className="font-semibold mb-1">Reject & Disable Access</p>
                          <p>This will disable <strong>{selectedUser.full_name || selectedUser.email}</strong>'s account.</p>
                        </div>
                        <TMLTextarea label="Rejection Reason (optional)" value={reviewRejectionReason} onChange={e => setReviewRejectionReason(e.target.value)} placeholder="Provide a reason..." rows={3} />
                        <div className="flex gap-2">
                          <TMLButton variant="danger" className="flex-1" loading={actionLoading} onClick={handleReviewReject}>Confirm Rejection</TMLButton>
                          <TMLButton variant="ghost" onClick={() => setReviewPanelAction(null)}>Cancel</TMLButton>
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
    </div>
  );
}