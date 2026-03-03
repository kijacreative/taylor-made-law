import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, Shield, User, Trash2, Mail, Search, Loader2 } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLBadge from '@/components/ui/TMLBadge';

export default function CircleMembers({ circleId, members, user, isAdmin }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const queryClient = useQueryClient();

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      // Check if a LawyerProfile exists with this email
      const profiles = await base44.entities.LawyerProfile.filter({ created_by: inviteEmail });
      if (profiles.length === 0) {
        setInviteResult({ error: 'No approved lawyer found with that email. Only approved network members can be invited.' });
        setInviting(false);
        return;
      }
      const profile = profiles[0];
      if (profile.status !== 'approved') {
        setInviteResult({ error: 'This attorney is not yet approved on the platform.' });
        setInviting(false);
        return;
      }

      // Check if already a member
      const existing = members.find(m => m.user_email === inviteEmail);
      if (existing) {
        setInviteResult({ error: 'This person is already a member of this circle.' });
        setInviting(false);
        return;
      }

      // Create invitation
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await base44.entities.LegalCircleInvitation.create({
        circle_id: circleId,
        inviter_user_id: user.id,
        inviter_name: user.full_name,
        invitee_email: inviteEmail,
        token,
        message: inviteMessage,
        status: 'pending',
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Create notification
      await base44.entities.CircleNotification.create({
        user_id: user.id, // We don't have the invitee's user_id easily, use email lookup
        user_email: inviteEmail,
        circle_id: circleId,
        type: 'invite',
        title: `You've been invited to join a Legal Circle`,
        body: `${user.full_name} invited you to join a circle on TML Network.`,
        is_read: false,
        reference_id: token
      }).catch(() => {});

      setInviteResult({ success: `Invitation sent to ${inviteEmail}!` });
      setInviteEmail('');
      setInviteMessage('');
      queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
    } catch (err) {
      setInviteResult({ error: 'Failed to send invitation. Please try again.' });
    }
    setInviting(false);
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Remove ${member.user_name} from the circle?`)) return;
    await base44.entities.LegalCircleMember.update(member.id, { status: 'removed' });
    queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
  };

  const handlePromote = async (member) => {
    if (!window.confirm(`Promote ${member.user_name} to circle admin?`)) return;
    await base44.entities.LegalCircleMember.update(member.id, { role: 'admin' });
    queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        {isAdmin && (
          <TMLButton variant="primary" size="sm" onClick={() => setShowInvite(!showInvite)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </TMLButton>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && isAdmin && (
        <div className="bg-white rounded-xl border border-[#3a164d]/20 p-5">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#3a164d]" />
            Invite Attorney
          </h4>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="attorney@firm.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Must be an approved TML Network attorney</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Message (optional)</label>
              <textarea
                rows={2}
                value={inviteMessage}
                onChange={e => setInviteMessage(e.target.value)}
                placeholder="Add a personal note..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
              />
            </div>
            {inviteResult && (
              <div className={`text-sm px-3 py-2 rounded-lg ${inviteResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {inviteResult.error || inviteResult.success}
              </div>
            )}
            <div className="flex gap-2">
              <TMLButton type="submit" variant="primary" size="sm" loading={inviting}>Send Invitation</TMLButton>
              <TMLButton type="button" variant="outline" size="sm" onClick={() => { setShowInvite(false); setInviteResult(null); }}>Cancel</TMLButton>
            </div>
          </form>
        </div>
      )}

      {/* Member List */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {members.map(member => {
          const isMe = member.user_id === user.id;
          const memberIsAdmin = member.role === 'admin';
          return (
            <div key={member.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a164d] to-[#a47864] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {member.user_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">{member.user_name} {isMe && <span className="text-gray-400 font-normal">(you)</span>}</p>
                  <TMLBadge variant={memberIsAdmin ? 'primary' : 'default'} size="sm">
                    {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                    {member.role}
                  </TMLBadge>
                </div>
                <p className="text-sm text-gray-500 truncate">{member.user_email}</p>
              </div>
              {isAdmin && !isMe && (
                <div className="flex gap-1">
                  {!memberIsAdmin && (
                    <button
                      onClick={() => handlePromote(member)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors"
                      title="Promote to admin"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(member)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}