import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser, getProfile } from '@/services/auth';
import { filterInvitations, listCircles, updateInvitation, acceptCircleInvite } from '@/services/circles';
import { getProfileByUserId } from '@/services/lawyers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Check, X, Loader2, Bell } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';

export default function GroupInvitations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState({});

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) { navigate(createPageUrl('Home')); return; }
        setUser(userData);
      } catch {
        navigate(createPageUrl('Home'));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => getProfile(user.id).then(p => p ? [p] : []),
    enabled: !!user?.id,
  });
  const lawyerProfile = profiles[0] || null;

  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['myInvites', user?.email],
    queryFn: () => filterInvitations({ invitee_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: circles = [] } = useQuery({
    queryKey: ['circleDetails'],
    queryFn: () => listCircles(),
    enabled: !!user,
  });

  // Fetch inviter profiles to get full names
  const inviterUserIds = [...new Set(invites.map(i => i.inviter_user_id).filter(Boolean))];
  const { data: inviterProfiles = [] } = useQuery({
    queryKey: ['inviterProfiles', inviterUserIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        inviterUserIds.map(uid => getProfileByUserId(uid).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: inviterUserIds.length > 0,
  });

  const getInviterName = (invite) => {
    const profile = inviterProfiles.find(p => p.user_id === invite.inviter_user_id);
    return profile?.full_name || invite.inviter_name || 'Unknown';
  };

  const handleAccept = async (invite) => {
    setActioning(a => ({ ...a, [invite.id]: 'accepting' }));
    // Call backend function to sync circle membership
    await acceptCircleInvite({
      invitation_id: invite.id,
      circle_id: invite.circle_id,
      inviter_user_id: invite.inviter_user_id
    });
    queryClient.invalidateQueries({ queryKey: ['myInvites'] });
    queryClient.invalidateQueries({ queryKey: ['myGroupMemberships'] });
    // Small delay to let membership propagate before loading circle page
    await new Promise(r => setTimeout(r, 600));
    navigate(`/GroupDetail?id=${invite.circle_id}`);
  };

  const handleDecline = async (invite) => {
    setActioning(a => ({ ...a, [invite.id]: 'declining' }));
    await updateInvitation(invite.id, { status: 'declined' });
    queryClient.invalidateQueries({ queryKey: ['myInvites'] });
    setActioning(a => ({ ...a, [invite.id]: null }));
  };

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const pastInvites = invites.filter(i => i.status !== 'pending');

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      <main className="ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          <Link to={createPageUrl('Groups')} className="inline-flex items-center text-gray-500 hover:text-[#3a164d] mb-6 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />Back to Circles
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#3a164d] flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Circle Invitations</h1>
              <p className="text-gray-500 text-sm">Manage your pending and past invitations</p>
            </div>
          </div>

          {invitesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" /></div>
          ) : (
            <>
              {pendingInvites.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 mb-6">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">No Pending Invitations</h3>
                  <p className="text-gray-500 text-sm">You don't have any pending circle invitations right now.</p>
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className="space-y-3 mb-8">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pending ({pendingInvites.length})</h2>
                  {pendingInvites.map((invite, i) => {
                    const circle = circles.find(c => c.id === invite.circle_id);
                    const isActioning = actioning[invite.id];
                    return (
                      <motion.div
                        key={invite.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-xl border border-gray-100 p-5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3a164d] to-[#a47864] flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{circle?.name || 'Legal Circle'}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Invited by {getInviterName(invite)}</p>
                            {invite.message && <p className="text-sm text-gray-600 mt-2 italic">"{invite.message}"</p>}
                            {circle?.description && <p className="text-sm text-gray-500 mt-1">{circle.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <TMLButton
                            variant="primary"
                            size="sm"
                            loading={isActioning === 'accepting'}
                            disabled={!!isActioning}
                            onClick={() => handleAccept(invite)}
                          >
                            <Check className="w-4 h-4 mr-1.5" />Accept
                          </TMLButton>
                          <TMLButton
                            variant="outline"
                            size="sm"
                            loading={isActioning === 'declining'}
                            disabled={!!isActioning}
                            onClick={() => handleDecline(invite)}
                          >
                            <X className="w-4 h-4 mr-1.5" />Decline
                          </TMLButton>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {pastInvites.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Past Invitations</h2>
                  {pastInvites.map(invite => {
                    const circle = circles.find(c => c.id === invite.circle_id);
                    return (
                      <div key={invite.id} className="bg-white rounded-xl border border-gray-100 p-4 opacity-60">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-700">{circle?.name || 'Legal Circle'}</p>
                            <p className="text-sm text-gray-400">From {getInviterName(invite)}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            invite.status === 'accepted' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {invite.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}