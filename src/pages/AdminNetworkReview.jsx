/**
 * AdminNetworkReview — Admin review queue for auto-approved attorneys.
 * Shows all auto-approved lawyers with review_status=pending, verified, or rejected.
 * Admins can verify (confirm bar #) or reject (disable account).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, Eye, Loader2,
  Mail, Phone, Building2, Scale, X, Shield, BadgeCheck,
  ArrowLeft, Users
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLTextarea from '@/components/ui/TMLTextarea';

const REVIEW_CONFIG = {
  pending:  { label: 'Pending Review', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  verified: { label: 'Verified',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { label: 'Rejected',       bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
};

const TABS = [
  { value: 'pending',  label: 'Pending Review' },
  { value: 'verified', label: 'Verified' },
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [panelAction, setPanelAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
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

  // Fetch all non-admin users (lawyers)
  const { data: allUsers = [], isLoading, refetch } = useQuery({
    queryKey: ['networkLawyers'],
    queryFn: async () => {
      const users = await base44.entities.User.list('-created_date');
      return users.filter(u => u.role !== 'admin');
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const counts = allUsers.reduce((acc, u) => {
    const rs = u.review_status || 'pending';
    acc[rs] = (acc[rs] || 0) + 1;
    return acc;
  }, {});

  const filtered = allUsers.filter(u => {
    if (activeTab && (u.review_status || 'pending') !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.firm_name?.toLowerCase().includes(s) ||
        u.bar_number?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      await base44.entities.User.update(selectedUser.id, {
        review_status: 'verified'
      });
      await base44.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: selectedUser.id,
        action: 'lawyer_verified',
        actor_email: user.email,
        actor_role: 'admin',
        notes: `Bar number verified by ${user.email}`
      });
      showToast(`${selectedUser.full_name || selectedUser.email} marked as verified.`);
      setSelectedUser(null);
      setPanelAction(null);
      refetch();
      queryClient.invalidateQueries(['networkLawyers']);
    } catch (err) {
      showToast(err.message || 'Verification failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('rejectLawyer', {
        user_id: selectedUser.id,
        rejection_reason: rejectionReason,
      });
      if (res.data?.success) {
        showToast(`${selectedUser.full_name || selectedUser.email} rejected and disabled.`);
        setSelectedUser(null);
        setPanelAction(null);
        setRejectionReason('');
        refetch();
        queryClient.invalidateQueries(['networkLawyers']);
      } else {
        showToast(res.data?.error || 'Rejection failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error rejecting.', 'error');
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
            <h1 className="text-2xl font-bold text-gray-900">Attorney Review Queue</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review auto-approved attorneys. Verify bar numbers or remove access.</p>
          </div>
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
            {[
              { label: 'Total Attorneys', count: allUsers.length, color: 'border-gray-100' },
              { label: 'Pending Review', count: counts.pending || 0, color: 'border-amber-100' },
              { label: 'Verified', count: counts.verified || 0, color: 'border-emerald-100' },
              { label: 'Rejected', count: counts.rejected || 0, color: 'border-red-100' },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-xl border px-5 py-4 ${s.color}`}>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            {TABS.map(tab => {
              const cnt = tab.value ? (counts[tab.value] || 0) : allUsers.length;
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
              <p className="text-gray-500 font-medium">No attorneys found in this category.</p>
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
                  {filtered.map(u => {
                    const rs = u.review_status || 'pending';
                    const rc = REVIEW_CONFIG[rs] || REVIEW_CONFIG.pending;
                    return (
                      <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => { setSelectedUser(u); setPanelAction(null); setRejectionReason(''); }}
                      >
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(u.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{u.full_name || '—'}</p>
                          <p className="text-gray-400 text-xs">{u.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-gray-700">{u.firm_name || '—'}</p>
                          <p className="text-gray-400 text-xs">{u.bar_number || 'No bar #'}</p>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-gray-600 text-xs">{(u.states_licensed || []).slice(0, 3).join(', ')}{(u.states_licensed || []).length > 3 ? ` +${u.states_licensed.length - 3}` : ''}</span>
                        </td>
                        <td className="px-5 py-4">
                          {u.referral_agreement_accepted
                            ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Accepted</span>
                            : <span className="flex items-center gap-1 text-amber-500 text-xs"><Clock className="w-3.5 h-3.5" />Pending</span>
                          }
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>
                            {rc.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setSelectedUser(u); setPanelAction(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100">
                              <Eye className="w-4 h-4" />
                            </button>
                            {rs !== 'verified' && rs !== 'rejected' && (
                              <>
                                <button onClick={() => { setSelectedUser(u); setPanelAction('verify'); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                                  Verify
                                </button>
                                <button onClick={() => { setSelectedUser(u); setPanelAction('reject'); }}
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
        {selectedUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30"
              onClick={() => { setSelectedUser(null); setPanelAction(null); }}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedUser(null); setPanelAction(null); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg leading-tight">{selectedUser.full_name || selectedUser.email}</h2>
                    <p className="text-sm text-gray-500">{selectedUser.firm_name || '—'}</p>
                  </div>
                </div>
                {(() => {
                  const rs = selectedUser.review_status || 'pending';
                  const rc = REVIEW_CONFIG[rs] || REVIEW_CONFIG.pending;
                  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${rc.bg} ${rc.text}`}>{rc.label}</span>;
                })()}
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
                      {selectedUser.states_licensed?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">States Licensed</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedUser.states_licensed.map(s => <span key={s} className="bg-white border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{s}</span>)}
                          </div>
                        </div>
                      )}
                      {selectedUser.practice_areas?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Practice Areas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedUser.practice_areas.map(a => <span key={a} className="bg-[#f5f0fa] text-[#3a164d] text-xs px-2 py-0.5 rounded-full">{a}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Agreement & Profile Status</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {selectedUser.referral_agreement_accepted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                      <span className="text-gray-700">Referral Agreement Accepted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedUser.profile_completed_at ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                      <span className="text-gray-700">Profile Completed</span>
                    </div>
                  </div>
                </section>

                {selectedUser.billing_demo_plan && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Billing (Demo)</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
                      <p className="text-gray-700">Plan: <strong>{selectedUser.billing_demo_plan}</strong></p>
                      {selectedUser.billing_demo_bank_name && <p className="text-gray-700">Bank: <strong>{selectedUser.billing_demo_bank_name}</strong></p>}
                      {selectedUser.billing_demo_last4 && <p className="text-gray-700">Account ending: <strong>••••{selectedUser.billing_demo_last4}</strong></p>}
                      <p className="text-gray-400 text-xs">Status: {selectedUser.billing_demo_status || 'not collected'}</p>
                    </div>
                  </section>
                )}

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

              {/* Action Footer */}
              {(selectedUser.review_status === 'pending' || !selectedUser.review_status) && (
                <div className="border-t border-gray-100 bg-white px-6 py-4">
                  <AnimatePresence mode="wait">
                    {!panelAction && (
                      <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <TMLButton variant="success" className="flex-1" onClick={() => setPanelAction('verify')}>
                          <BadgeCheck className="w-4 h-4 mr-2" /> Mark Verified
                        </TMLButton>
                        <TMLButton variant="danger" className="flex-1" onClick={() => setPanelAction('reject')}>
                          <XCircle className="w-4 h-4 mr-2" /> Reject & Disable
                        </TMLButton>
                      </motion.div>
                    )}
                    {panelAction === 'verify' && (
                      <motion.div key="verify" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-800 border border-emerald-100">
                          <p className="font-semibold mb-1">Confirm Verification</p>
                          <p>Mark <strong>{selectedUser.full_name || selectedUser.email}</strong> as verified. This confirms their bar number has been checked.</p>
                        </div>
                        <div className="flex gap-2">
                          <TMLButton variant="success" className="flex-1" loading={actionLoading} onClick={handleVerify}>
                            Confirm Verification
                          </TMLButton>
                          <TMLButton variant="ghost" onClick={() => setPanelAction(null)}>Cancel</TMLButton>
                        </div>
                      </motion.div>
                    )}
                    {panelAction === 'reject' && (
                      <motion.div key="reject" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="p-3 bg-red-50 rounded-xl text-sm text-red-800 border border-red-100">
                          <p className="font-semibold mb-1">Reject & Disable Access</p>
                          <p>This will disable <strong>{selectedUser.full_name || selectedUser.email}</strong>'s account and send them a rejection email.</p>
                        </div>
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
    </div>
  );
}