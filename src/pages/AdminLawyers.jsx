import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, CheckCircle2, XCircle, Clock, Mail, Phone,
  Scale, Building2, Loader2, X, Shield, Eye,
  Plus, AlertCircle, Ban, RotateCcw, Info, Send, Download,
  FileText, BadgeCheck, ArrowLeft
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import TMLSelect from '@/components/ui/TMLSelect';

// ─── Config ────────────────────────────────────────────────────────────────

const USER_STATUS_CONFIG = {
  invited:   { label: 'Invited',   color: 'bg-blue-100 text-blue-700' },
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Approved',  color: 'bg-emerald-100 text-emerald-700' },
  disabled:  { label: 'Disabled',  color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
};

const APP_STATUS_CONFIG = {
  pending:  { label: 'Pending Review', bg: 'bg-amber-50',   text: 'text-amber-700' },
  approved: { label: 'Approved',       bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { label: 'Rejected',       bg: 'bg-red-50',     text: 'text-red-700' },
};

const ATTORNEY_TABS = ['pending', 'invited', 'approved', 'disabled'];
const APP_TABS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '',         label: 'All' },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminLawyers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Top-level section: 'applications' | 'attorneys' | 'profiles'
  const [section, setSection] = useState('applications');

  // Applications state
  const [appTab, setAppTab] = useState('pending');
  const [appSearch, setAppSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [appPanelAction, setAppPanelAction] = useState(null);
  const [appRejectionReason, setAppRejectionReason] = useState('');
  const [appFreeTrialMonths, setAppFreeTrialMonths] = useState(0);
  const [appActionLoading, setAppActionLoading] = useState(false);

  // Attorneys state
  const [attTab, setAttTab] = useState('pending');
  const [attSearch, setAttSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  // Profiles state
  const [profileTab, setProfileTab] = useState('pending');
  const [profileSearch, setProfileSearch] = useState('');
  const [approvingProfile, setApprovingProfile] = useState(null);
  const [profileFreeTrialMonths, setProfileFreeTrialMonths] = useState(0);
  const [profileActionLoading, setProfileActionLoading] = useState(false);

  const [viewingUser, setViewingUser] = useState(null);
  const [approvingUser, setApprovingUser] = useState(null);
  const [disablingUser, setDisablingUser] = useState(null);
  const [moreInfoUser, setMoreInfoUser] = useState(null);
  const [freeTrialMonths, setFreeTrialMonths] = useState('6');
  const [disableReason, setDisableReason] = useState('');
  const [moreInfoItems, setMoreInfoItems] = useState('');
  const [moreInfoNotes, setMoreInfoNotes] = useState('');
  const [inviteData, setInviteData] = useState({
    email: '', full_name: '', firm_name: '',
    states_served: [], practice_areas: [], admin_note: ''
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('Home')); return; }
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') { navigate(createPageUrl('LawyerDashboard')); return; }
        setAuthUser(userData);
      } catch { navigate(createPageUrl('Home')); }
      finally { setLoading(false); }
    };
    checkAuth();
  }, [navigate]);

  // ── Data Queries ──────────────────────────────────────────────────────────

  const { data: applications = [], isLoading: appsLoading, refetch: refetchApps } = useQuery({
    queryKey: ['lawyerApplications'],
    queryFn: () => base44.entities.LawyerApplication.list('-created_date'),
    enabled: !!authUser,
    refetchInterval: 30000,
  });

  const { data: allUsers = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['allLawyerUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: !!authUser,
  });

  const lawyerUsers = allUsers.filter(u => u.role !== 'admin' && u.user_status);

  // ── Filtered Lists ────────────────────────────────────────────────────────

  const appCounts = applications.reduce((acc, app) => {
    const s = app.status || 'pending';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filteredApps = applications.filter(app => {
    if (appTab && (app.status || 'pending') !== appTab) return false;
    if (appSearch) {
      const s = appSearch.toLowerCase();
      return app.full_name?.toLowerCase().includes(s) || app.email?.toLowerCase().includes(s) ||
        app.firm_name?.toLowerCase().includes(s) || app.bar_number?.toLowerCase().includes(s);
    }
    return true;
  });

  const attCounts = ATTORNEY_TABS.reduce((acc, t) => {
    acc[t] = lawyerUsers.filter(u => u.user_status === t).length;
    return acc;
  }, {});

  const filteredUsers = lawyerUsers.filter(u => {
    if (u.user_status !== attTab) return false;
    if (attSearch) {
      const s = attSearch.toLowerCase();
      return u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.firm_name?.toLowerCase().includes(s);
    }
    return true;
  });

  // ── Application Actions ───────────────────────────────────────────────────

  const handleAppApprove = async () => {
    setAppActionLoading(true);
    try {
      const res = await base44.functions.invoke('approveLawyerApplication', {
        application_id: selectedApp.id,
        free_trial_months: appFreeTrialMonths,
      });
      if (res.data?.success) {
        showToast(`${selectedApp.full_name || selectedApp.email} approved. Activation email sent.`);
        setSelectedApp(null); setAppPanelAction(null); setAppFreeTrialMonths(0);
        refetchApps();
      } else {
        showToast(res.data?.error || 'Approval failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error approving.', 'error');
    } finally { setAppActionLoading(false); }
  };

  const handleAppReject = async () => {
    setAppActionLoading(true);
    try {
      const res = await base44.functions.invoke('rejectLawyerApplication', {
        application_id: selectedApp.id,
        rejection_reason: appRejectionReason,
      });
      if (res.data?.success) {
        showToast(`${selectedApp.full_name || selectedApp.email} rejected.`);
        setSelectedApp(null); setAppPanelAction(null); setAppRejectionReason('');
        refetchApps();
      } else {
        showToast(res.data?.error || 'Rejection failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error rejecting.', 'error');
    } finally { setAppActionLoading(false); }
  };

  // ── Attorney Actions ──────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!approvingUser) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('approveLawyer', {
        user_id: approvingUser.id,
        free_trial_months: parseInt(freeTrialMonths) || 0
      });
      if (res.data?.success) {
        showToast(`${approvingUser.full_name || approvingUser.email} approved successfully!`);
        setApprovingUser(null); refetchUsers();
      } else { showToast(res.data?.error || 'Approval failed.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDisable = async () => {
    if (!disablingUser) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('disableLawyer', { user_id: disablingUser.id, reason: disableReason });
      if (res.data?.success) {
        showToast(`${disablingUser.full_name || disablingUser.email} disabled.`);
        setDisablingUser(null); setDisableReason(''); refetchUsers();
      } else { showToast(res.data?.error || 'Failed to disable.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleReinstate = async (user) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('reinstateLawyer', { user_id: user.id, reinstate_to_status: 'pending' });
      if (res.data?.success) { showToast(`${user.full_name || user.email} reinstated.`); refetchUsers(); }
      else { showToast(res.data?.error || 'Failed to reinstate.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleResendActivation = async (user) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('resendActivation', { user_id: user.id });
      if (res.data?.success) { showToast(`Activation email resent to ${user.email}.`); }
      else { showToast(res.data?.error || 'Failed to resend.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleRequestMoreInfo = async () => {
    if (!moreInfoUser) return;
    const items = moreInfoItems.split('\n').map(s => s.trim()).filter(Boolean);
    if (!items.length && !moreInfoNotes) { showToast('Add at least one checklist item or a note.', 'error'); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('requestMoreInfo', { user_id: moreInfoUser.id, checklist_items: items, admin_notes: moreInfoNotes });
      if (res.data?.success) {
        showToast(`More info request sent to ${moreInfoUser.email}.`);
        setMoreInfoUser(null); setMoreInfoItems(''); setMoreInfoNotes(''); refetchUsers();
      } else { showToast(res.data?.error || 'Failed to send.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await base44.functions.invoke('generateLegacyReport', {});
      if (res.data?.success && res.data?.csv) {
        const blob = new Blob([res.data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tml-attorney-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); a.remove();
        showToast(`Report generated: ${res.data.summary?.total_lawyer_users || 0} users.`);
      } else { showToast(res.data?.error || 'Failed to generate report.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
    finally { setGeneratingReport(false); }
  };

  const handleInvite = async () => {
    if (!inviteData.email) { showToast('Email is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('inviteAttorney', inviteData);
      if (res.data?.success) {
        showToast('Invitation sent successfully!');
        setShowInviteModal(false);
        setInviteData({ email: '', full_name: '', firm_name: '', states_served: [], practice_areas: [], admin_note: '' });
        refetchUsers();
      } else { showToast(res.data?.error || 'Failed to send invitation.', 'error'); }
    } catch (err) { showToast(err.response?.data?.error || err.message, 'error'); }
    finally { setSaving(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar user={authUser} currentPage="AdminLawyers" />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attorney Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review applications and manage active attorneys.</p>
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {toast && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-md ${
                    toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                  {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {toast.msg}
                  <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                </motion.div>
              )}
            </AnimatePresence>
            {section === 'attorneys' && (
              <>
                <TMLButton variant="outline" onClick={handleGenerateReport} loading={generatingReport}>
                  <Download className="w-4 h-4 mr-2" /> Export
                </TMLButton>
                <TMLButton variant="primary" onClick={() => setShowInviteModal(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Invite Attorney
                </TMLButton>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">

          {/* Section Switcher */}
          <div className="flex gap-1 mb-8 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            <button onClick={() => setSection('applications')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${section === 'applications' ? 'bg-[#3a164d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <FileText className="w-4 h-4" /> Applications
              {(appCounts.pending || 0) > 0 && (
                <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${section === 'applications' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                  {appCounts.pending}
                </span>
              )}
            </button>
            <button onClick={() => setSection('attorneys')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${section === 'attorneys' ? 'bg-[#3a164d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <Users className="w-4 h-4" /> Active Attorneys
            </button>
          </div>

          {/* ── APPLICATIONS SECTION ── */}
          {section === 'applications' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Applications', count: applications.length, border: 'border-gray-100' },
                  { label: 'Pending Review', count: appCounts.pending || 0, border: 'border-amber-100' },
                  { label: 'Approved', count: appCounts.approved || 0, border: 'border-emerald-100' },
                  { label: 'Rejected', count: appCounts.rejected || 0, border: 'border-red-100' },
                ].map(s => (
                  <div key={s.label} className={`bg-white rounded-xl border px-5 py-4 ${s.border}`}>
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
                <input type="text" placeholder="Search name, email, firm, bar number..." value={appSearch} onChange={e => setAppSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]" />
              </div>

              {appsLoading ? (
                <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No applications in this category.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Applied</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attorney</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Firm / Bar #</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">States</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredApps.map(app => {
                        const sc = APP_STATUS_CONFIG[app.status] || APP_STATUS_CONFIG.pending;
                        return (
                          <motion.tr key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => { setSelectedApp(app); setAppPanelAction(null); setAppRejectionReason(''); setAppFreeTrialMonths(0); }}>
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">{new Date(app.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="px-5 py-4"><p className="font-semibold text-gray-900">{app.full_name || '—'}</p><p className="text-gray-400 text-xs">{app.email}</p></td>
                            <td className="px-5 py-4"><p className="text-gray-700">{app.firm_name || '—'}</p><p className="text-gray-400 text-xs">{app.bar_number || 'No bar #'}</p></td>
                            <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">{(app.states_licensed || []).slice(0, 3).join(', ')}{(app.states_licensed || []).length > 3 ? ` +${app.states_licensed.length - 3}` : ''}</td>
                            <td className="px-5 py-4"><span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span></td>
                            <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setSelectedApp(app); setAppPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100"><Eye className="w-4 h-4" /></button>
                                {app.status === 'pending' && (
                                  <>
                                    <button onClick={() => { setSelectedApp(app); setAppPanelAction('approve'); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Approve</button>
                                    <button onClick={() => { setSelectedApp(app); setAppPanelAction('reject'); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100">Reject</button>
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

          {/* ── ACTIVE ATTORNEYS SECTION ── */}
          {section === 'attorneys' && (
            <>
              <div className="flex gap-2 mb-6 flex-wrap">
                {ATTORNEY_TABS.map(tab => (
                  <button key={tab} onClick={() => setAttTab(tab)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${attTab === tab ? 'bg-[#3a164d] text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
                    {USER_STATUS_CONFIG[tab]?.label}
                    <span className={`ml-2 ${attTab === tab ? 'text-white/70' : 'text-gray-400'}`}>({attCounts[tab] || 0})</span>
                  </button>
                ))}
              </div>

              <div className="relative mb-5 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by name, email, or firm..." value={attSearch} onChange={e => setAttSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]" />
              </div>

              <p className="text-gray-600 mb-4 text-sm">Showing <span className="font-semibold">{filteredUsers.length}</span> {USER_STATUS_CONFIG[attTab]?.label.toLowerCase()} attorneys</p>

              {usersLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No {USER_STATUS_CONFIG[attTab]?.label} attorneys.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((u, i) => (
                    <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3a164d] to-[#7e277e] flex items-center justify-center text-white font-semibold flex-shrink-0 text-lg">
                              {(u.full_name || u.email || 'L').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap mb-1">
                                <h3 className="font-semibold text-gray-900">{u.full_name || '—'}</h3>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${USER_STATUS_CONFIG[u.user_status]?.color}`}>{USER_STATUS_CONFIG[u.user_status]?.label}</span>
                                {!u.password_set ? (
                                  <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Not Activated</span>
                                ) : (
                                  <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">✓ Activated</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{u.email}</span>
                                {u.firm_name && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{u.firm_name}</span>}
                              </div>
                              {(u.states_licensed?.length > 0 || u.practice_areas?.length > 0) && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {(u.states_licensed || []).slice(0, 3).map(s => <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>)}
                                  {(u.practice_areas || []).slice(0, 2).map(a => <span key={a} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{a}</span>)}
                                </div>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                Joined: {u.created_date ? new Date(u.created_date).toLocaleDateString() : '—'}
                                {u.approved_at && ` · Approved: ${new Date(u.approved_at).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end shrink-0">
                            <button onClick={() => setViewingUser(u)} className="flex items-center gap-1.5 text-sm text-[#3a164d] hover:underline font-medium"><Eye className="w-4 h-4" /> View</button>
                            {(u.user_status === 'pending' || u.user_status === 'invited') && (
                              <button onClick={() => setApprovingUser(u)} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:underline font-medium"><CheckCircle2 className="w-4 h-4" /> Approve</button>
                            )}
                            {u.user_status === 'pending' && (
                              <button onClick={() => setMoreInfoUser(u)} className="flex items-center gap-1.5 text-sm text-amber-600 hover:underline font-medium"><Info className="w-4 h-4" /> Request Info</button>
                            )}
                            {!u.password_set && u.user_status !== 'disabled' && (
                              <button onClick={() => handleResendActivation(u)} disabled={saving} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium disabled:opacity-50"><Send className="w-4 h-4" /> Resend Activation</button>
                            )}
                            {u.user_status === 'approved' && (
                              <button onClick={() => setDisablingUser(u)} className="flex items-center gap-1.5 text-sm text-red-600 hover:underline font-medium"><Ban className="w-4 h-4" /> Disable</button>
                            )}
                            {u.user_status === 'disabled' && (
                              <button onClick={() => handleReinstate(u)} disabled={saving} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:underline font-medium disabled:opacity-50"><RotateCcw className="w-4 h-4" /> Reinstate</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Application Detail Side Panel ── */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-30" onClick={() => { setSelectedApp(null); setAppPanelAction(null); }} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedApp(null); setAppPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
                  <div><h2 className="font-bold text-gray-900 text-lg leading-tight">{selectedApp.full_name || selectedApp.email}</h2><p className="text-sm text-gray-500">{selectedApp.firm_name || '—'}</p></div>
                </div>
                {(() => { const sc = APP_STATUS_CONFIG[selectedApp.status] || APP_STATUS_CONFIG.pending; return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>; })()}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attorney Info</h3>
                  <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />Email</p><p className="font-medium text-gray-900">{selectedApp.email}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</p><p className="font-medium text-gray-900">{selectedApp.phone || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />Firm</p><p className="font-medium text-gray-900">{selectedApp.firm_name || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Scale className="w-3 h-3" />Bar #</p><p className="font-medium text-gray-900">{selectedApp.bar_number || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5">Years Exp.</p><p className="font-medium text-gray-900">{selectedApp.years_experience || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5">Applied</p><p className="font-medium text-gray-900">{new Date(selectedApp.created_date).toLocaleDateString()}</p></div>
                  </div>
                </section>
                {selectedApp.bio && (
                  <section><h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bio</h3><p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{selectedApp.bio}</p></section>
                )}
                {(selectedApp.states_licensed?.length > 0 || selectedApp.practice_areas?.length > 0) && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Practice</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                      {selectedApp.states_licensed?.length > 0 && <div><p className="text-xs text-gray-400 mb-1.5">States Licensed</p><div className="flex flex-wrap gap-1.5">{selectedApp.states_licensed.map(s => <span key={s} className="bg-white border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{s}</span>)}</div></div>}
                      {selectedApp.practice_areas?.length > 0 && <div><p className="text-xs text-gray-400 mb-1.5">Practice Areas</p><div className="flex flex-wrap gap-1.5">{selectedApp.practice_areas.map(a => <span key={a} className="bg-[#f5f0fa] text-[#3a164d] text-xs px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
                    </div>
                  </section>
                )}
                {selectedApp.referrals?.length > 0 && (
                  <section><h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Referrals</h3><div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">{selectedApp.referrals.map((r, i) => <div key={i} className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-700">{r.name}</span>{r.email && <span className="text-gray-400 text-xs">— {r.email}</span>}</div>)}</div></section>
                )}
                {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
                  <section><h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rejection Record</h3><div className="bg-red-50 rounded-xl p-4 text-sm"><p className="text-red-700">Rejected by <strong>{selectedApp.reviewed_by}</strong></p>{selectedApp.reviewed_at && <p className="text-red-400 text-xs mt-1">{new Date(selectedApp.reviewed_at).toLocaleString()}</p>}<p className="text-red-600 mt-2">Reason: {selectedApp.rejection_reason}</p></div></section>
                )}
              </div>

              {selectedApp.status === 'pending' && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <AnimatePresence mode="wait">
                    {!appPanelAction && (
                      <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <TMLButton variant="success" className="flex-1" onClick={() => setAppPanelAction('approve')}><BadgeCheck className="w-4 h-4 mr-2" /> Approve</TMLButton>
                        <TMLButton variant="danger" className="flex-1" onClick={() => setAppPanelAction('reject')}><XCircle className="w-4 h-4 mr-2" /> Reject</TMLButton>
                      </motion.div>
                    )}
                    {appPanelAction === 'approve' && (
                      <motion.div key="approve" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-800 border border-emerald-100"><p className="font-semibold mb-1">Confirm Approval</p><p>Approving <strong>{selectedApp.full_name || selectedApp.email}</strong> will send them an activation email.</p></div>
                        <div><label className="text-xs text-gray-500 font-medium block mb-1">Free Trial Months (optional)</label><input type="number" min="0" max="24" value={appFreeTrialMonths} onChange={e => setAppFreeTrialMonths(parseInt(e.target.value) || 0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20" /></div>
                        <div className="flex gap-2"><TMLButton variant="success" className="flex-1" loading={appActionLoading} onClick={handleAppApprove}>Confirm Approval</TMLButton><TMLButton variant="ghost" onClick={() => setAppPanelAction(null)}>Cancel</TMLButton></div>
                      </motion.div>
                    )}
                    {appPanelAction === 'reject' && (
                      <motion.div key="reject" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-red-50 rounded-xl text-sm text-red-800 border border-red-100"><p className="font-semibold mb-1">Reject Application</p><p>This will reject <strong>{selectedApp.full_name || selectedApp.email}</strong> and send a rejection email.</p></div>
                        <TMLTextarea label="Rejection Reason (optional)" value={appRejectionReason} onChange={e => setAppRejectionReason(e.target.value)} placeholder="Provide a reason..." rows={3} />
                        <div className="flex gap-2"><TMLButton variant="danger" className="flex-1" loading={appActionLoading} onClick={handleAppReject}>Confirm Rejection</TMLButton><TMLButton variant="ghost" onClick={() => setAppPanelAction(null)}>Cancel</TMLButton></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Approve User Modal ── */}
      {approvingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Approve Attorney</h3>
            <p className="text-gray-600 mb-6">Approve <strong>{approvingUser.full_name || approvingUser.email}</strong> to join the network.</p>
            <TMLSelect label="Free Trial Period" options={[{ value: '0', label: 'No free trial' }, { value: '1', label: '1 month free' }, { value: '3', label: '3 months free' }, { value: '6', label: '6 months free (default)' }, { value: '12', label: '12 months free' }]} value={freeTrialMonths} onChange={e => setFreeTrialMonths(e.target.value)} />
            <p className="text-sm text-gray-500 mt-2 mb-6">{approvingUser.password_set ? '✓ Already activated — will receive login link.' : '✓ Not yet activated — will receive activation email.'}</p>
            <div className="flex gap-3">
              <TMLButton variant="outline" onClick={() => setApprovingUser(null)} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="success" onClick={handleApprove} className="flex-1" loading={saving}><CheckCircle2 className="w-4 h-4 mr-2" /> Approve</TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Disable Modal ── */}
      {disablingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Disable Account</h3>
            <p className="text-gray-600 mb-4">Disable <strong>{disablingUser.full_name || disablingUser.email}</strong>. They will be blocked from logging in.</p>
            <TMLTextarea label="Reason (internal)" value={disableReason} onChange={e => setDisableReason(e.target.value)} placeholder="Optional reason for audit log..." rows={3} />
            <div className="flex gap-3 mt-4">
              <TMLButton variant="outline" onClick={() => setDisablingUser(null)} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="danger" onClick={handleDisable} className="flex-1" loading={saving}><Ban className="w-4 h-4 mr-2" /> Disable Account</TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Request More Info Modal ── */}
      {moreInfoUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Request More Information</h3>
            <p className="text-gray-600 mb-4">Send a request to <strong>{moreInfoUser.full_name || moreInfoUser.email}</strong>.</p>
            <TMLTextarea label="Checklist Items (one per line)" value={moreInfoItems} onChange={e => setMoreInfoItems(e.target.value)} placeholder="Bar verification document&#10;Certificate of Good Standing" rows={4} />
            <div className="mt-3"><TMLTextarea label="Additional Notes (optional)" value={moreInfoNotes} onChange={e => setMoreInfoNotes(e.target.value)} placeholder="Any additional context..." rows={2} /></div>
            <div className="flex gap-3 mt-4">
              <TMLButton variant="outline" onClick={() => { setMoreInfoUser(null); setMoreInfoItems(''); setMoreInfoNotes(''); }} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="primary" onClick={handleRequestMoreInfo} className="flex-1" loading={saving}><Mail className="w-4 h-4 mr-2" /> Send Request</TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <div><h3 className="text-xl font-bold text-gray-900">Invite Attorney</h3><p className="text-sm text-gray-500 mt-1">Send an invitation to join the TML network</p></div>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <TMLInput label="Email Address *" type="email" required value={inviteData.email} onChange={e => setInviteData({ ...inviteData, email: e.target.value })} placeholder="attorney@lawfirm.com" />
              <TMLInput label="Full Name (optional)" value={inviteData.full_name} onChange={e => setInviteData({ ...inviteData, full_name: e.target.value })} placeholder="Jane Smith" />
              <TMLInput label="Firm Name (optional)" value={inviteData.firm_name} onChange={e => setInviteData({ ...inviteData, firm_name: e.target.value })} placeholder="Smith & Associates" />
              <TMLTextarea label="Admin Note (optional, sent in email)" value={inviteData.admin_note} onChange={e => setInviteData({ ...inviteData, admin_note: e.target.value })} placeholder="We met at the conference last week..." rows={3} />
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex gap-3">
              <TMLButton variant="outline" onClick={() => setShowInviteModal(false)} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="primary" onClick={handleInvite} className="flex-1" loading={saving}><Mail className="w-4 h-4 mr-2" /> Send Invitation</TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── View User Detail Modal ── */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <div><h3 className="text-xl font-bold text-gray-900">{viewingUser.full_name || viewingUser.email}</h3><p className="text-sm text-gray-500 mt-1">{viewingUser.email}</p></div>
              <button onClick={() => setViewingUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${USER_STATUS_CONFIG[viewingUser.user_status]?.color}`}>{USER_STATUS_CONFIG[viewingUser.user_status]?.label}</span>
                {viewingUser.email_verified && <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">✓ Email Verified</span>}
                {viewingUser.password_set ? <span className="text-sm font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">✓ Activated</span> : <span className="text-sm font-medium bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">⚠ Not Activated</span>}
                {viewingUser.referral_agreement_accepted && <span className="text-sm font-medium bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full"><Shield className="w-3 h-3 inline mr-1" />Agreement Signed</span>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[['Firm', viewingUser.firm_name], ['Phone', viewingUser.phone], ['Bar #', viewingUser.bar_number], ['Experience', viewingUser.years_experience ? `${viewingUser.years_experience} years` : null], ['Approved', viewingUser.approved_at ? new Date(viewingUser.approved_at).toLocaleDateString() : null], ['Approved By', viewingUser.approved_by]].map(([label, val]) => val ? (
                  <div key={label}><span className="text-gray-500">{label}:</span><span className="ml-2 font-medium text-gray-800">{val}</span></div>
                ) : null)}
              </div>
              {viewingUser.bio && <div><p className="text-sm font-medium text-gray-700 mb-1">Bio</p><p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewingUser.bio}</p></div>}
              {viewingUser.states_licensed?.length > 0 && <div><p className="text-sm font-medium text-gray-700 mb-2">States Licensed</p><div className="flex flex-wrap gap-1.5">{viewingUser.states_licensed.map(s => <span key={s} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{s}</span>)}</div></div>}
              {viewingUser.practice_areas?.length > 0 && <div><p className="text-sm font-medium text-gray-700 mb-2">Practice Areas</p><div className="flex flex-wrap gap-1.5">{viewingUser.practice_areas.map(a => <span key={a} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">{a}</span>)}</div></div>}
              {viewingUser.disabled_reason && <div><p className="text-sm font-medium text-gray-700 mb-1">Disable Reason</p><p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{viewingUser.disabled_reason}</p></div>}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {(viewingUser.user_status === 'pending' || viewingUser.user_status === 'invited') && <TMLButton variant="success" size="sm" onClick={() => { setViewingUser(null); setApprovingUser(viewingUser); }}><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</TMLButton>}
                  {viewingUser.user_status === 'pending' && <TMLButton variant="outline" size="sm" onClick={() => { setViewingUser(null); setMoreInfoUser(viewingUser); }}><Info className="w-4 h-4 mr-1" /> Request Info</TMLButton>}
                  {!viewingUser.password_set && viewingUser.user_status !== 'disabled' && <TMLButton variant="info" size="sm" onClick={() => { handleResendActivation(viewingUser); setViewingUser(null); }}><Send className="w-4 h-4 mr-1" /> Resend Activation</TMLButton>}
                  {viewingUser.user_status === 'approved' && <TMLButton variant="danger" size="sm" onClick={() => { setViewingUser(null); setDisablingUser(viewingUser); }}><Ban className="w-4 h-4 mr-1" /> Disable</TMLButton>}
                  {viewingUser.user_status === 'disabled' && <TMLButton variant="success" size="sm" onClick={() => { handleReinstate(viewingUser); setViewingUser(null); }}><RotateCcw className="w-4 h-4 mr-1" /> Reinstate</TMLButton>}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}