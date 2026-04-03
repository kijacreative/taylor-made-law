/**
 * AdminNetworkReview — Admin review queue for public lawyer applications.
 * Shows LawyerApplication records submitted via /JoinNetwork.
 * Admins can Approve & Invite (sends invite email) or Reject.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, inviteUser } from '@/services/auth';
import { listApplications, updateApplication } from '@/services/lawyers';
import { createAuditLog } from '@/services/admin';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, Eye, Loader2,
  Mail, Phone, Building2, Scale, X, UserPlus,
  ArrowLeft, Users, RefreshCw
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLTextarea from '@/components/ui/TMLTextarea';

const STATUS_CONFIG = {
  pending:  { label: 'Pending Review', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  approved: { label: 'Approved',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  active:   { label: 'Active',         bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  rejected: { label: 'Rejected',       bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
};

const TABS = [
  { value: 'pending',  label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'active',   label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
  { value: '',         label: 'All' },
];

export default function AdminNetworkReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [panelAction, setPanelAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) { navigate('/Home'); return; }
        if (currentUser.role !== 'admin') { navigate('/LawyerDashboard'); return; }
        setUser(currentUser);
      } catch { navigate('/Home'); }
      finally { setAuthLoading(false); }
    })();
  }, [navigate]);

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['lawyerApplications'],
    queryFn: () => listApplications('-created_date', 200),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const counts = applications.reduce((acc, a) => {
    const s = a.status || 'pending';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filtered = applications.filter(a => {
    if (activeTab && (a.status || 'pending') !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        a.full_name?.toLowerCase().includes(s) ||
        a.email?.toLowerCase().includes(s) ||
        a.firm_name?.toLowerCase().includes(s) ||
        a.bar_number?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleApproveAndInvite = async () => {
    setActionLoading(true);
    try {
      // Invite the user (admin-only, we are authenticated as admin here)
      await inviteUser(selected.email, 'user');

      // Update application status
      await updateApplication(selected.id, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
      });

      await createAuditLog({
        entity_type: 'LawyerApplication',
        entity_id: selected.id,
        action: 'application_approved',
        actor_email: user.email,
        actor_role: 'admin',
        notes: `Application approved and invite sent to ${selected.email} by ${user.email}`,
      }).catch(() => {});

      showToast(`Invite sent to ${selected.email}`);
      setSelected(null);
      setPanelAction(null);
      refetch();
      queryClient.invalidateQueries(['lawyerApplications']);
    } catch (err) {
      showToast(err.message || 'Failed to approve and invite.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await updateApplication(selected.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
      });

      await createAuditLog({
        entity_type: 'LawyerApplication',
        entity_id: selected.id,
        action: 'application_rejected',
        actor_email: user.email,
        actor_role: 'admin',
        notes: `Application rejected by ${user.email}. Reason: ${rejectionReason || 'none'}`,
      }).catch(() => {});

      showToast(`${selected.full_name || selected.email} rejected.`);
      setSelected(null);
      setPanelAction(null);
      setRejectionReason('');
      refetch();
      queryClient.invalidateQueries(['lawyerApplications']);
    } catch (err) {
      showToast(err.message || 'Rejection failed.', 'error');
    } finally {
      setActionLoading(false);
    }
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
      <AdminSidebar user={user} currentPage="AdminNetworkReview" />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attorney Application Queue</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review public lawyer applications. Approve to send an account invite, or reject.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => refetch()} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
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
        </div>

        <div className="flex-1 p-8 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Applications', count: applications.length, color: 'border-gray-100' },
              { label: 'Pending Review', count: counts.pending || 0, color: 'border-amber-100' },
              { label: 'Approved', count: (counts.approved || 0) + (counts.active || 0), color: 'border-emerald-100' },
              { label: 'Rejected', count: counts.rejected || 0, color: 'border-red-100' },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-xl border px-5 py-4 ${s.color}`}>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit flex-wrap">
            {TABS.map(tab => {
              const cnt = tab.value ? (counts[tab.value] || 0) : applications.length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.value ? 'bg-[#3a164d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label} <span className={`ml-1.5 text-xs ${activeTab === tab.value ? 'opacity-75' : 'text-gray-400'}`}>({cnt})</span>
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
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No applications in this category.</p>
              {activeTab === 'pending' && <p className="text-gray-400 text-sm mt-1">New applications from /JoinNetwork will appear here.</p>}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attorney</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Firm / Bar #</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">States</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(app => {
                    const status = app.status || 'pending';
                    const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                    return (
                      <motion.tr key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => { setSelected(app); setPanelAction(null); setRejectionReason(''); }}
                      >
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
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-gray-600 text-xs">{(app.states_licensed || []).slice(0, 3).join(', ')}{(app.states_licensed || []).length > 3 ? ` +${app.states_licensed.length - 3}` : ''}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setSelected(app); setPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100">
                              <Eye className="w-4 h-4" />
                            </button>
                            {status === 'pending' && (
                              <>
                                <button onClick={() => { setSelected(app); setPanelAction('approve'); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                                  Approve & Invite
                                </button>
                                <button onClick={() => { setSelected(app); setPanelAction('reject'); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
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
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30"
              onClick={() => { setSelected(null); setPanelAction(null); }}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelected(null); setPanelAction(null); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg leading-tight">{selected.full_name || selected.email}</h2>
                    <p className="text-sm text-gray-500">{selected.firm_name || '—'}</p>
                  </div>
                </div>
                {(() => {
                  const sc = STATUS_CONFIG[selected.status || 'pending'] || STATUS_CONFIG.pending;
                  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>;
                })()}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Application Details</h3>
                  <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />Email</p><p className="font-medium text-gray-900">{selected.email}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</p><p className="font-medium text-gray-900">{selected.phone || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />Firm</p><p className="font-medium text-gray-900">{selected.firm_name || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Scale className="w-3 h-3" />Bar #</p><p className="font-medium text-gray-900">{selected.bar_number || '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5">Years Experience</p><p className="font-medium text-gray-900">{selected.years_experience ?? '—'}</p></div>
                    <div><p className="text-xs text-gray-400 mb-0.5">Applied</p><p className="font-medium text-gray-900">{new Date(selected.created_date).toLocaleDateString()}</p></div>
                  </div>
                </section>

                {(selected.states_licensed?.length > 0 || selected.practice_areas?.length > 0) && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Practice</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                      {selected.states_licensed?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">States Licensed</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selected.states_licensed.map(s => <span key={s} className="bg-white border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{s}</span>)}
                          </div>
                        </div>
                      )}
                      {selected.practice_areas?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Practice Areas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selected.practice_areas.map(a => <span key={a} className="bg-[#f5f0fa] text-[#3a164d] text-xs px-2 py-0.5 rounded-full">{a}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {selected.bio && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bio</h3>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">{selected.bio}</div>
                  </section>
                )}

                {selected.reviewed_by && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Review Record</h3>
                    <div className={`rounded-xl p-4 text-sm ${selected.status === 'rejected' ? 'bg-red-50' : 'bg-emerald-50'}`}>
                      <p className={selected.status === 'rejected' ? 'text-red-700' : 'text-emerald-700'}>
                        Reviewed by <strong>{selected.reviewed_by}</strong>
                      </p>
                      {selected.reviewed_at && <p className="text-gray-400 text-xs mt-1">{new Date(selected.reviewed_at).toLocaleString()}</p>}
                      {selected.rejection_reason && <p className="text-red-600 mt-2">Reason: {selected.rejection_reason}</p>}
                    </div>
                  </section>
                )}
              </div>

              {/* Action Footer */}
              {(selected.status === 'pending' || !selected.status) && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <AnimatePresence mode="wait">
                    {!panelAction && (
                      <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <TMLButton variant="primary" className="flex-1" onClick={() => setPanelAction('approve')}>
                          <UserPlus className="w-4 h-4 mr-2" /> Approve & Invite
                        </TMLButton>
                        <TMLButton variant="danger" className="flex-1" onClick={() => setPanelAction('reject')}>
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </TMLButton>
                      </motion.div>
                    )}
                    {panelAction === 'approve' && (
                      <motion.div key="approve" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-800 border border-emerald-100">
                          <p className="font-semibold mb-1">Approve & Send Invite</p>
                          <p>This will send an account setup invite email to <strong>{selected.email}</strong> and mark their application as approved.</p>
                        </div>
                        <div className="flex gap-2">
                          <TMLButton variant="primary" className="flex-1" loading={actionLoading} onClick={handleApproveAndInvite}>
                            Confirm & Send Invite
                          </TMLButton>
                          <TMLButton variant="ghost" onClick={() => setPanelAction(null)}>Cancel</TMLButton>
                        </div>
                      </motion.div>
                    )}
                    {panelAction === 'reject' && (
                      <motion.div key="reject" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-red-50 rounded-xl text-sm text-red-800 border border-red-100">
                          <p className="font-semibold mb-1">Reject Application</p>
                          <p>Reject <strong>{selected.full_name || selected.email}</strong>'s application.</p>
                        </div>
                        <TMLTextarea
                          label="Rejection Reason (optional)"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          placeholder="Provide a reason..."
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
    </div>
  );
}