import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, CheckCircle2, XCircle, Clock, Mail, Phone,
  MapPin, Scale, Building2, Loader2, X, Gift, Shield, Eye,
  Edit, Plus, RefreshCw, AlertCircle, Ban, RotateCcw, Info, Send
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import TMLSelect from '@/components/ui/TMLSelect';

const STATUS_CONFIG = {
  invited: { label: 'Invited', color: 'bg-blue-100 text-blue-700' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  disabled: { label: 'Disabled', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
};

const TABS = ['pending', 'invited', 'approved', 'disabled'];

export default function AdminLawyers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [approvingUser, setApprovingUser] = useState(null);
  const [disablingUser, setDisablingUser] = useState(null);
  const [moreInfoUser, setMoreInfoUser] = useState(null);

  // Form states
  const [freeTrialMonths, setFreeTrialMonths] = useState('6');
  const [disableReason, setDisableReason] = useState('');
  const [moreInfoItems, setMoreInfoItems] = useState('');
  const [moreInfoNotes, setMoreInfoNotes] = useState('');
  const [inviteData, setInviteData] = useState({
    email: '', full_name: '', firm_name: '',
    states_served: [], practice_areas: [], admin_note: ''
  });

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

  const { data: allUsers = [], isLoading: usersLoading, refetch } = useQuery({
    queryKey: ['allLawyerUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: !!authUser,
  });

  // Filter to lawyer users only (non-admin) with user_status set
  const lawyerUsers = allUsers.filter(u => u.role !== 'admin' && u.user_status);

  const tabCounts = TABS.reduce((acc, t) => {
    acc[t] = lawyerUsers.filter(u => u.user_status === t).length;
    return acc;
  }, {});

  const filteredUsers = lawyerUsers.filter(u => {
    if (u.user_status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.firm_name?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const notify = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); };
  const notifyError = (msg) => { setActionError(msg); setTimeout(() => setActionError(null), 5000); };

  const handleApprove = async () => {
    if (!approvingUser) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('approveLawyer', {
        user_id: approvingUser.id,
        free_trial_months: parseInt(freeTrialMonths) || 0
      });
      if (res.data?.success) {
        notify(`${approvingUser.full_name || approvingUser.email} approved successfully!`);
        setApprovingUser(null);
        refetch();
      } else {
        notifyError(res.data?.error || 'Approval failed.');
      }
    } catch (err) {
      notifyError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!disablingUser) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('disableLawyer', {
        user_id: disablingUser.id,
        reason: disableReason
      });
      if (res.data?.success) {
        notify(`${disablingUser.full_name || disablingUser.email} disabled.`);
        setDisablingUser(null);
        setDisableReason('');
        refetch();
      } else {
        notifyError(res.data?.error || 'Failed to disable.');
      }
    } catch (err) {
      notifyError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReinstate = async (user) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('reinstateLawyer', {
        user_id: user.id,
        reinstate_to_status: 'pending'
      });
      if (res.data?.success) {
        notify(`${user.full_name || user.email} reinstated.`);
        refetch();
      } else {
        notifyError(res.data?.error || 'Failed to reinstate.');
      }
    } catch (err) {
      notifyError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResendActivation = async (user) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('resendActivation', { user_id: user.id });
      if (res.data?.success) {
        notify(`Activation email resent to ${user.email}.`);
      } else {
        notifyError(res.data?.error || 'Failed to resend.');
      }
    } catch (err) {
      notifyError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!moreInfoUser) return;
    const items = moreInfoItems.split('\n').map(s => s.trim()).filter(s => s);
    if (!items.length && !moreInfoNotes) {
      notifyError('Please add at least one checklist item or a note.');
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('requestMoreInfo', {
        user_id: moreInfoUser.id,
        checklist_items: items,
        admin_notes: moreInfoNotes
      });
      if (res.data?.success) {
        notify(`More info request sent to ${moreInfoUser.email}.`);
        setMoreInfoUser(null);
        setMoreInfoItems('');
        setMoreInfoNotes('');
        refetch();
      } else {
        notifyError(res.data?.error || 'Failed to send.');
      }
    } catch (err) {
      notifyError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteData.email) { notifyError('Email is required'); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('inviteAttorney', inviteData);
      if (res.data?.success) {
        notify('Invitation sent successfully!');
        setShowInviteModal(false);
        setInviteData({ email: '', full_name: '', firm_name: '', states_served: [], practice_areas: [], admin_note: '' });
        refetch();
      } else {
        notifyError(res.data?.error || 'Failed to send invitation.');
      }
    } catch (err) {
      notifyError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar user={authUser} />

      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attorney Management</h1>
              <p className="text-gray-600 mt-1">Manage attorney identities, applications, and access.</p>
            </div>
            <TMLButton variant="primary" onClick={() => setShowInviteModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Invite Attorney
            </TMLButton>
          </div>

          {/* Notifications */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-5 h-5" /><span>{success}</span>
                <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
            {actionError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
                <AlertCircle className="w-5 h-5" /><span>{actionError}</span>
                <button onClick={() => setActionError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-[#3a164d] text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}>
                {STATUS_CONFIG[tab]?.label}
                <span className={`ml-2 ${activeTab === tab ? 'text-white/70' : 'text-gray-400'}`}>
                  ({tabCounts[tab] || 0})
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or firm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
              />
            </div>
          </div>

          {/* Results count */}
          <p className="text-gray-600 mb-4">
            Showing <span className="font-semibold">{filteredUsers.length}</span> {STATUS_CONFIG[activeTab]?.label.toLowerCase()} attorneys
          </p>

          {/* User List */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
          ) : filteredUsers.length === 0 ? (
            <TMLCard variant="cream" className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No {STATUS_CONFIG[activeTab]?.label} Attorneys</h3>
              <p className="text-gray-600">{search ? 'Try adjusting your search.' : `No ${activeTab} attorneys yet.`}</p>
            </TMLCard>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <TMLCard hover className="transition-all hover:shadow-md">
                    <TMLCardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3a164d] to-[#7e277e] flex items-center justify-center text-white font-semibold flex-shrink-0 text-lg">
                            {(u.full_name || u.email || 'L').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                              <h3 className="font-semibold text-gray-900">{u.full_name || '—'}</h3>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[u.user_status]?.color}`}>
                                {STATUS_CONFIG[u.user_status]?.label}
                              </span>
                              {u.email_verified && (
                                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                                  ✓ Email Verified
                                </span>
                              )}
                              {u.password_set && (
                                <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                  ✓ Activated
                                </span>
                              )}
                              {!u.password_set && (
                                <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                  Not Activated
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{u.email}</span>
                              {u.firm_name && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{u.firm_name}</span>}
                              {u.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{u.phone}</span>}
                            </div>
                            {(u.states_licensed?.length > 0 || u.practice_areas?.length > 0) && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {(u.states_licensed || []).slice(0, 3).map(s => (
                                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                                ))}
                                {(u.practice_areas || []).slice(0, 2).map(a => (
                                  <span key={a} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{a}</span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              Joined: {u.created_date ? new Date(u.created_date).toLocaleDateString() : '—'}
                              {u.approved_at && ` · Approved: ${new Date(u.approved_at).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 items-end shrink-0">
                          <button onClick={() => setViewingUser(u)} className="flex items-center gap-1.5 text-sm text-[#3a164d] hover:underline font-medium">
                            <Eye className="w-4 h-4" /> View
                          </button>
                          {(u.user_status === 'pending' || u.user_status === 'invited') && (
                            <button onClick={() => setApprovingUser(u)} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:underline font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Approve
                            </button>
                          )}
                          {u.user_status === 'pending' && (
                            <button onClick={() => setMoreInfoUser(u)} className="flex items-center gap-1.5 text-sm text-amber-600 hover:underline font-medium">
                              <Info className="w-4 h-4" /> Request Info
                            </button>
                          )}
                          {!u.password_set && u.user_status !== 'disabled' && (
                            <button onClick={() => handleResendActivation(u)} disabled={saving} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium disabled:opacity-50">
                              <Send className="w-4 h-4" /> Resend Activation
                            </button>
                          )}
                          {u.user_status === 'approved' && (
                            <button onClick={() => setDisablingUser(u)} className="flex items-center gap-1.5 text-sm text-red-600 hover:underline font-medium">
                              <Ban className="w-4 h-4" /> Disable
                            </button>
                          )}
                          {u.user_status === 'disabled' && (
                            <button onClick={() => handleReinstate(u)} disabled={saving} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:underline font-medium disabled:opacity-50">
                              <RotateCcw className="w-4 h-4" /> Reinstate
                            </button>
                          )}
                        </div>
                      </div>
                    </TMLCardContent>
                  </TMLCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Approve Modal ── */}
      {approvingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Approve Attorney</h3>
            <p className="text-gray-600 mb-6">Approve <strong>{approvingUser.full_name || approvingUser.email}</strong> to join the network.</p>
            <TMLSelect
              label="Free Trial Period"
              options={[
                { value: '0', label: 'No free trial' },
                { value: '1', label: '1 month free' },
                { value: '3', label: '3 months free' },
                { value: '6', label: '6 months free (default)' },
                { value: '12', label: '12 months free' },
              ]}
              value={freeTrialMonths}
              onChange={e => setFreeTrialMonths(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-2 mb-6">
              {approvingUser.password_set
                ? '✓ Already activated — will receive "You\'re Approved" email with login link.'
                : '✓ Not yet activated — will receive activation email to set password.'}
            </p>
            <div className="flex gap-3">
              <TMLButton variant="outline" onClick={() => setApprovingUser(null)} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="success" onClick={handleApprove} className="flex-1" loading={saving}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Disable Modal ── */}
      {disablingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Disable Account</h3>
            <p className="text-gray-600 mb-4">Disable <strong>{disablingUser.full_name || disablingUser.email}</strong>. They will be notified and blocked from logging in.</p>
            <TMLTextarea
              label="Reason (internal, not sent to user)"
              value={disableReason}
              onChange={e => setDisableReason(e.target.value)}
              placeholder="Optional reason for audit log..."
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <TMLButton variant="outline" onClick={() => setDisablingUser(null)} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="danger" onClick={handleDisable} className="flex-1" loading={saving}>
                <Ban className="w-4 h-4 mr-2" /> Disable Account
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Request More Info Modal ── */}
      {moreInfoUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Request More Information</h3>
            <p className="text-gray-600 mb-4">Send a request to <strong>{moreInfoUser.full_name || moreInfoUser.email}</strong> for additional information.</p>
            <TMLTextarea
              label="Checklist Items (one per line)"
              value={moreInfoItems}
              onChange={e => setMoreInfoItems(e.target.value)}
              placeholder="Bar verification document&#10;Certificate of Good Standing&#10;References from colleagues"
              rows={4}
            />
            <div className="mt-3">
              <TMLTextarea
                label="Additional Notes (optional)"
                value={moreInfoNotes}
                onChange={e => setMoreInfoNotes(e.target.value)}
                placeholder="Any additional context for the applicant..."
                rows={2}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <TMLButton variant="outline" onClick={() => { setMoreInfoUser(null); setMoreInfoItems(''); setMoreInfoNotes(''); }} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="primary" onClick={handleRequestMoreInfo} className="flex-1" loading={saving}>
                <Mail className="w-4 h-4 mr-2" /> Send Request
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Invite Attorney</h3>
                <p className="text-sm text-gray-500 mt-1">Send an invitation to join the TML network</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <TMLInput label="Email Address *" type="email" required value={inviteData.email}
                onChange={e => setInviteData({ ...inviteData, email: e.target.value })} placeholder="attorney@lawfirm.com" />
              <TMLInput label="Full Name (optional)" value={inviteData.full_name}
                onChange={e => setInviteData({ ...inviteData, full_name: e.target.value })} placeholder="Jane Smith" />
              <TMLInput label="Firm Name (optional)" value={inviteData.firm_name}
                onChange={e => setInviteData({ ...inviteData, firm_name: e.target.value })} placeholder="Smith & Associates" />
              <TMLTextarea label="Admin Note (optional, sent in email)" value={inviteData.admin_note}
                onChange={e => setInviteData({ ...inviteData, admin_note: e.target.value })}
                placeholder="We met at the conference last week..." rows={3} />
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex gap-3">
              <TMLButton variant="outline" onClick={() => setShowInviteModal(false)} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="primary" onClick={handleInvite} className="flex-1" loading={saving}>
                <Mail className="w-4 h-4 mr-2" /> Send Invitation
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── View User Detail Modal ── */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{viewingUser.full_name || viewingUser.email}</h3>
                <p className="text-sm text-gray-500 mt-1">{viewingUser.email}</p>
              </div>
              <button onClick={() => setViewingUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Status row */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_CONFIG[viewingUser.user_status]?.color}`}>
                  {STATUS_CONFIG[viewingUser.user_status]?.label}
                </span>
                {viewingUser.email_verified && <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">✓ Email Verified</span>}
                {viewingUser.password_set
                  ? <span className="text-sm font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">✓ Password Set (Activated)</span>
                  : <span className="text-sm font-medium bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">⚠ Not Activated</span>}
                {viewingUser.referral_agreement_accepted && <span className="text-sm font-medium bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full"><Shield className="w-3 h-3 inline mr-1" />Agreement Signed</span>}
              </div>

              {/* Profile Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Firm', viewingUser.firm_name],
                  ['Phone', viewingUser.phone],
                  ['Bar #', viewingUser.bar_number],
                  ['Experience', viewingUser.years_experience ? `${viewingUser.years_experience} years` : null],
                  ['Approved', viewingUser.approved_at ? new Date(viewingUser.approved_at).toLocaleDateString() : null],
                  ['Approved By', viewingUser.approved_by],
                  ['More Info Requested', viewingUser.more_info_requested_at ? new Date(viewingUser.more_info_requested_at).toLocaleDateString() : null],
                ].map(([label, val]) => val ? (
                  <div key={label}>
                    <span className="text-gray-500">{label}:</span>
                    <span className="ml-2 font-medium text-gray-800">{val}</span>
                  </div>
                ) : null)}
              </div>

              {viewingUser.bio && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Bio</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewingUser.bio}</p>
                </div>
              )}

              {(viewingUser.states_licensed?.length > 0) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">States Licensed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingUser.states_licensed.map(s => <span key={s} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{s}</span>)}
                  </div>
                </div>
              )}

              {(viewingUser.practice_areas?.length > 0) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Practice Areas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingUser.practice_areas.map(a => <span key={a} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">{a}</span>)}
                  </div>
                </div>
              )}

              {viewingUser.admin_note && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Admin Note</p>
                  <p className="text-sm text-gray-600 bg-amber-50 rounded-lg p-3 border border-amber-100">{viewingUser.admin_note}</p>
                </div>
              )}

              {viewingUser.disabled_reason && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Disable Reason</p>
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{viewingUser.disabled_reason}</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {(viewingUser.user_status === 'pending' || viewingUser.user_status === 'invited') && (
                    <TMLButton variant="success" size="sm" onClick={() => { setViewingUser(null); setApprovingUser(viewingUser); }}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                    </TMLButton>
                  )}
                  {viewingUser.user_status === 'pending' && (
                    <TMLButton variant="outline" size="sm" onClick={() => { setViewingUser(null); setMoreInfoUser(viewingUser); }}>
                      <Info className="w-4 h-4 mr-1" /> Request Info
                    </TMLButton>
                  )}
                  {!viewingUser.password_set && viewingUser.user_status !== 'disabled' && (
                    <TMLButton variant="info" size="sm" onClick={() => { handleResendActivation(viewingUser); setViewingUser(null); }}>
                      <Send className="w-4 h-4 mr-1" /> Resend Activation
                    </TMLButton>
                  )}
                  {viewingUser.user_status === 'approved' && (
                    <TMLButton variant="danger" size="sm" onClick={() => { setViewingUser(null); setDisablingUser(viewingUser); }}>
                      <Ban className="w-4 h-4 mr-1" /> Disable
                    </TMLButton>
                  )}
                  {viewingUser.user_status === 'disabled' && (
                    <TMLButton variant="success" size="sm" onClick={() => { handleReinstate(viewingUser); setViewingUser(null); }}>
                      <RotateCcw className="w-4 h-4 mr-1" /> Reinstate
                    </TMLButton>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}