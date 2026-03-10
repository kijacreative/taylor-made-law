import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, Eye, Loader2,
  Mail, Phone, Building2, Scale, X, BadgeCheck, Users, ArrowLeft, FileText
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLTextarea from '@/components/ui/TMLTextarea';

const STATUS_CONFIG = {
  pending:  { label: 'Pending Review', bg: 'bg-amber-50',   text: 'text-amber-700' },
  approved: { label: 'Approved',       bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { label: 'Rejected',       bg: 'bg-red-50',     text: 'text-red-700' },
};

const TABS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '',         label: 'All' },
];

export default function AdminLawyerApplications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [panelAction, setPanelAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [freeTrialMonths, setFreeTrialMonths] = useState(0);
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

  const counts = applications.reduce((acc, app) => {
    const s = app.status || 'pending';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filtered = applications.filter(app => {
    if (activeTab && (app.status || 'pending') !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return app.full_name?.toLowerCase().includes(s) || app.email?.toLowerCase().includes(s) ||
        app.firm_name?.toLowerCase().includes(s) || app.bar_number?.toLowerCase().includes(s);
    }
    return true;
  });

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('approveLawyerApplication', {
        application_id: selectedApp.id,
        free_trial_months: freeTrialMonths,
      });
      if (res.data?.success) {
        showToast(`${selectedApp.full_name || selectedApp.email} approved. Activation email sent.`);
        setSelectedApp(null); setPanelAction(null); setFreeTrialMonths(0);
        refetch(); queryClient.invalidateQueries(['lawyerApplications']);
      } else {
        showToast(res.data?.error || 'Approval failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error approving.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('rejectLawyerApplication', {
        application_id: selectedApp.id,
        rejection_reason: rejectionReason,
      });
      if (res.data?.success) {
        showToast(`${selectedApp.full_name || selectedApp.email} rejected.`);
        setSelectedApp(null); setPanelAction(null); setRejectionReason('');
        refetch(); queryClient.invalidateQueries(['lawyerApplications']);
      } else {
        showToast(res.data?.error || 'Rejection failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error rejecting.', 'error');
    } finally { setActionLoading(false); }
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

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attorney Applications</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review and approve attorneys who applied to join the network.</p>
          </div>
          <AnimatePresence>
            {toast && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-md ${
                  toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {toast.msg}
                <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Applications', count: applications.length, color: 'border-gray-100' },
              { label: 'Pending Review', count: counts.pending || 0, color: 'border-amber-100' },
              { label: 'Approved', count: counts.approved || 0, color: 'border-emerald-100' },
              { label: 'Rejected', count: counts.rejected || 0, color: 'border-red-100' },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-xl border px-5 py-4 ${s.color}`}>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            {TABS.map(tab => {
              const cnt = tab.value ? (counts[tab.value] || 0) : applications.length;
              return (
                <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.value ? 'bg-[#3a164d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  {tab.label} <span className={`ml-1.5 text-xs ${activeTab === tab.value ? 'opacity-75' : 'text-gray-400'}`}>({cnt})</span>
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No applications found in this category.</p>
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
                  {filtered.map(app => {
                    const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                    return (
                      <motion.tr key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => { setSelectedApp(app); setPanelAction(null); setRejectionReason(''); setFreeTrialMonths(0); }}>
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(app.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{app.full_name || '—'}</p>
                          <p className="text-gray-400 text-xs">{app.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-gray-700">{app.firm_name || '—'}</p>
                          <p className="text-gray-400 text-xs">{app.bar_number || 'No bar #'}</p>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-gray-600 text-xs">
                          {(app.states_licensed || []).slice(0, 3).join(', ')}{(app.states_licensed || []).length > 3 ? ` +${app.states_licensed.length - 3}` : ''}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setSelectedApp(app); setPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100"><Eye className="w-4 h-4" /></button>
                            {app.status === 'pending' && (
                              <>
                                <button onClick={() => { setSelectedApp(app); setPanelAction('approve'); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Approve</button>
                                <button onClick={() => { setSelectedApp(app); setPanelAction('reject'); }}
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
        </div>
      </div>

      {/* Detail Side Panel */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30" onClick={() => { setSelectedApp(null); setPanelAction(null); }} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedApp(null); setPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg leading-tight">{selectedApp.full_name || selectedApp.email}</h2>
                    <p className="text-sm text-gray-500">{selectedApp.firm_name || '—'}</p>
                  </div>
                </div>
                {(() => { const sc = STATUS_CONFIG[selectedApp.status] || STATUS_CONFIG.pending; return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>; })()}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attorney Info</h3>
                  <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />Email</p><p className="font-medium text-gray-900">{selectedApp.email}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</p><p className="font-medium text-gray-900">{selectedApp.phone || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />Firm</p><p className="font-medium text-gray-900">{selectedApp.firm_name || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Scale className="w-3 h-3" />Bar #</p><p className="font-medium text-gray-900">{selectedApp.bar_number || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5">Years Experience</p><p className="font-medium text-gray-900">{selectedApp.years_experience || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5">Applied</p><p className="font-medium text-gray-900">{new Date(selectedApp.created_date).toLocaleDateString()}</p></div>
                  </div>
                </section>

                {selectedApp.bio && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bio</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{selectedApp.bio}</p>
                  </section>
                )}

                {(selectedApp.states_licensed?.length > 0 || selectedApp.practice_areas?.length > 0) && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Practice</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                      {selectedApp.states_licensed?.length > 0 && (
                        <div><p className="text-xs text-gray-400 mb-1.5">States Licensed</p>
                          <div className="flex flex-wrap gap-1.5">{selectedApp.states_licensed.map(s => <span key={s} className="bg-white border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{s}</span>)}</div>
                        </div>
                      )}
                      {selectedApp.practice_areas?.length > 0 && (
                        <div><p className="text-xs text-gray-400 mb-1.5">Practice Areas</p>
                          <div className="flex flex-wrap gap-1.5">{selectedApp.practice_areas.map(a => <span key={a} className="bg-[#f5f0fa] text-[#3a164d] text-xs px-2 py-0.5 rounded-full">{a}</span>)}</div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {selectedApp.referrals?.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Referrals</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      {selectedApp.referrals.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-700">{r.name}</span>
                          {r.email && <span className="text-gray-400 text-xs">— {r.email}</span>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rejection Record</h3>
                    <div className="bg-red-50 rounded-xl p-4 text-sm">
                      <p className="text-red-700">Rejected by <strong>{selectedApp.reviewed_by}</strong></p>
                      {selectedApp.reviewed_at && <p className="text-red-400 text-xs mt-1">{new Date(selectedApp.reviewed_at).toLocaleString()}</p>}
                      <p className="text-red-600 mt-2">Reason: {selectedApp.rejection_reason}</p>
                    </div>
                  </section>
                )}
              </div>

              {selectedApp.status === 'pending' && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <AnimatePresence mode="wait">
                    {!panelAction && (
                      <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <TMLButton variant="success" className="flex-1" onClick={() => setPanelAction('approve')}><BadgeCheck className="w-4 h-4 mr-2" /> Approve</TMLButton>
                        <TMLButton variant="danger" className="flex-1" onClick={() => setPanelAction('reject')}><XCircle className="w-4 h-4 mr-2" /> Reject</TMLButton>
                      </motion.div>
                    )}
                    {panelAction === 'approve' && (
                      <motion.div key="approve" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-800 border border-emerald-100">
                          <p className="font-semibold mb-1">Confirm Approval</p>
                          <p>Approving <strong>{selectedApp.full_name || selectedApp.email}</strong> will send them an activation email to set up their account.</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1">Free Trial Months (optional)</label>
                          <input type="number" min="0" max="24" value={freeTrialMonths}
                            onChange={e => setFreeTrialMonths(parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20" />
                        </div>
                        <div className="flex gap-2">
                          <TMLButton variant="success" className="flex-1" loading={actionLoading} onClick={handleApprove}>Confirm Approval</TMLButton>
                          <TMLButton variant="ghost" onClick={() => setPanelAction(null)}>Cancel</TMLButton>
                        </div>
                      </motion.div>
                    )}
                    {panelAction === 'reject' && (
                      <motion.div key="reject" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-red-50 rounded-xl text-sm text-red-800 border border-red-100">
                          <p className="font-semibold mb-1">Reject Application</p>
                          <p>This will reject <strong>{selectedApp.full_name || selectedApp.email}</strong> and send them a rejection email.</p>
                        </div>
                        <TMLTextarea label="Rejection Reason (optional)" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Provide a reason — will be included in the rejection email..." rows={3} />
                        <div className="flex gap-2">
                          <TMLButton variant="danger" className="flex-1" loading={actionLoading} onClick={handleReject}>Confirm Rejection</TMLButton>
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
    </div>
  );
}