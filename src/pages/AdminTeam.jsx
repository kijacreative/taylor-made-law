import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, UserPlus, Mail, Shield, X, CheckCircle2, AlertCircle, Users, Trash2, KeyRound, MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';

export default function AdminTeam() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

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
    queryKey: ['allAdminUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: !!authUser,
  });

  const adminUsers = allUsers.filter(u => u.role === 'admin');

  const notify = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); };
  const notifyError = (msg) => { setError(msg); setTimeout(() => setError(null), 5000); };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { notifyError('Email is required.'); return; }
    setSaving(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim().toLowerCase(), 'admin');
      notify(`Admin invitation sent to ${inviteEmail.trim()}.`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      refetch();
    } catch (err) {
      notifyError(err.response?.data?.error || err.message || 'Failed to send invitation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar user={authUser} />

      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Team</h1>
              <p className="text-gray-600 mt-1">Manage administrator access to this platform.</p>
            </div>
            <TMLButton variant="primary" onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Invite Admin
            </TMLButton>
          </div>

          {/* Notifications */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 shrink-0" /><span>{success}</span>
                <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              Admins have full access to all platform features. Only invite trusted team members.
              Invited users will receive an email to set their password and access the admin dashboard.
            </p>
          </div>

          {/* Admin List */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
          ) : adminUsers.length === 0 ? (
            <TMLCard className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No admins found.</p>
            </TMLCard>
          ) : (
            <div className="space-y-3">
              {adminUsers.map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <TMLCard>
                    <TMLCardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3a164d] to-[#7e277e] flex items-center justify-center text-white font-semibold text-lg shrink-0">
                          {(u.full_name || u.email || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{u.full_name || '—'}</h3>
                            <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                            {u.id === authUser?.id && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">You</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{u.email}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Joined: {u.created_date ? new Date(u.created_date).toLocaleDateString() : '—'}
                          </p>
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Invite Admin</h3>
                <p className="text-sm text-gray-500 mt-0.5">They'll receive an email to set their password.</p>
              </div>
              <button onClick={() => { setShowInviteModal(false); setInviteEmail(''); setInviteName(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <TMLInput
                label="Email Address *"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="newadmin@taylormadelaw.com"
                required
              />
            </div>
            <div className="flex gap-3 mt-6">
              <TMLButton variant="outline" onClick={() => { setShowInviteModal(false); setInviteEmail(''); }} className="flex-1">Cancel</TMLButton>
              <TMLButton variant="primary" onClick={handleInvite} className="flex-1" loading={saving}>
                <Mail className="w-4 h-4 mr-2" /> Send Invite
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}