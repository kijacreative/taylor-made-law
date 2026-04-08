import React, { useState, useRef, useEffect } from 'react';
import { filterInvitations, filterMembers, updateInvitation, updateMember, createCircleInvitation, sendCircleInviteEmail, approveMember, denyMember } from '@/services/circles';
import { searchNetworkAttorneys } from '@/services/lawyers';
import { startDirectThread } from '@/services/messaging';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MemberProfileModal from './MemberProfileModal';
import { UserPlus, Shield, Trash2, Mail, Search, Loader2, CheckCircle, ExternalLink, X, Clock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TMLButton from '@/components/ui/TMLButton';
import TMLBadge from '@/components/ui/TMLBadge';

export default function CircleMembers({ circleId, members, user, isAdmin, circleName }) {
  const navigate = useNavigate();

  const handleDM = async (member) => {
    if (member.user_id === user.id) return;
    const res = await startDirectThread(member.user_id);
    const threadData = res?.data || res;
    if (threadData?.thread_id) {
      navigate(`/app/messages/${threadData.thread_id}`);
    }
  };
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAttorney, setSelectedAttorney] = useState(null); // null = no selection; {email, name, ...} = on-network; 'external' = non-network
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const queryClient = useQueryClient();
  const searchTimeout = useRef(null);

  const memberEmails = new Set(members.map(m => m.user_email));

  const { data: pendingJoinRequests = [], refetch: refetchPendingJoins } = useQuery({
    queryKey: ['pendingJoinRequests', circleId],
    queryFn: () => filterMembers({ circle_id: circleId, status: 'pending' }),
    enabled: !!circleId && isAdmin,
  });

  const { data: pendingInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ['circlePendingInvites', circleId],
    queryFn: () => filterInvitations({ circle_id: circleId, status: 'pending' }),
    enabled: !!circleId,
  });

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchNetworkAttorneys(searchQuery);
        const raw = Array.isArray(res) ? res : (res?.data?.results || res?.results || []);
        setSearchResults(raw.map(r => ({
          user_id: r.user_id || r.id,
          name: r.full_name || r.name || r.email,
          firm_name: r.firm_name || '',
          email: r.email || '',
        })));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [searchQuery]);

  const resetInviteForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedAttorney(null);
    setExternalEmail('');
    setExternalName('');
    setInviteMessage('');
    setInviteResult(null);
  };

  const handleSelectAttorney = (attorney) => {
    setSelectedAttorney(attorney);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleInviteNetworkMember = async () => {
    if (!selectedAttorney || selectedAttorney === 'external') return;
    if (memberEmails.has(selectedAttorney.email)) {
      setInviteResult({ error: 'This attorney is already a member of this circle.' });
      return;
    }
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await createCircleInvitation({
        circle_id: circleId,
        invitee_email: selectedAttorney.email,
        invitee_name: selectedAttorney.name,
        invitee_user_id: selectedAttorney.user_id,
        message: inviteMessage,
        circle_name: circleName
      });

      if (res.data?.error) {
        setInviteResult({ error: res.data.error });
      } else {
        setInviteResult({ success: `Invitation sent to ${selectedAttorney.name || selectedAttorney.email}!` });
        setSelectedAttorney(null);
        setInviteMessage('');
        queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
      queryClient.invalidateQueries({ queryKey: ['circlePendingInvites', circleId] });
      }
    } catch (err) {
      setInviteResult({ error: err?.response?.data?.error || 'Failed to send invitation. Please try again.' });
    }
    setInviting(false);
  };

  const handleInviteExternal = async (e) => {
    e.preventDefault();
    if (!externalEmail) return;
    setInviting(true);
    setInviteResult(null);
    try {
      await sendCircleInviteEmail({
        invitee_email: externalEmail,
        invitee_name: externalName,
        circle_name: circleName || 'Legal Circle',
        circle_id: circleId,
        message: inviteMessage,
        is_network_member: false
      }).catch(() => {});

      setInviteResult({ success: `Network join invitation sent to ${externalEmail}!` });
      setSelectedAttorney(null);
      setExternalEmail('');
      setExternalName('');
      setInviteMessage('');
    } catch {
      setInviteResult({ error: 'Failed to send invitation.' });
    }
    setInviting(false);
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Remove ${member.user_name} from the circle?`)) return;
    await updateMember(member.id, { status: 'removed' });
    queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
  };

  const handlePromote = async (member) => {
    if (!window.confirm(`Promote ${member.user_name} to circle admin?`)) return;
    await updateMember(member.id, { role: 'admin' });
    queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
  };

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}{pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending` : ''}</p>
        {isAdmin && (
          <TMLButton variant="primary" size="sm" onClick={() => { setShowInvite(!showInvite); resetInviteForm(); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </TMLButton>
        )}
      </div>

      {/* Invite Panel */}
      {showInvite && isAdmin && (
        <div className="bg-white rounded-xl border border-[#3a164d]/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#3a164d]" />
              Invite Attorney
            </h4>
            <button onClick={() => { setShowInvite(false); resetInviteForm(); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Result */}
          {inviteResult && (
            <div className={`text-sm px-3 py-2.5 rounded-lg flex items-center gap-2 ${inviteResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {inviteResult.error ? null : <CheckCircle className="w-4 h-4 shrink-0" />}
              {inviteResult.error || inviteResult.success}
            </div>
          )}

          {/* Step 1: Search or choose external */}
          {!selectedAttorney && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search TML Network Attorneys</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or firm..."
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-56 overflow-y-auto shadow-sm">
                  {searchResults.map((attorney) => {
                    const alreadyMember = memberEmails.has(attorney.email);
                    return (
                      <button
                        key={attorney.email}
                        disabled={alreadyMember}
                        onClick={() => handleSelectAttorney(attorney)}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                          alreadyMember ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-[#3a164d]/5'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3a164d] to-[#a47864] flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {attorney.name?.charAt(0)?.toUpperCase() || attorney.email?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{attorney.name || attorney.email}</p>
                          <p className="text-xs text-gray-500 truncate">{attorney.firm_name ? `${attorney.firm_name} · ` : ''}{attorney.email}</p>
                          {attorney.practice_areas?.length > 0 && (
                            <p className="text-xs text-[#3a164d] truncate">{attorney.practice_areas.slice(0, 2).join(', ')}</p>
                          )}
                        </div>
                        {alreadyMember ? (
                          <span className="text-xs text-gray-400 shrink-0">Member</span>
                        ) : (
                          <span className="text-xs font-medium text-[#3a164d] shrink-0">Select</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
                  No TML Network attorneys found for "{searchQuery}".
                </div>
              )}

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200" />
                <span className="mx-3 text-xs text-gray-400 whitespace-nowrap">not on the network?</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <button
                onClick={() => setSelectedAttorney('external')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#3a164d]/30 hover:text-[#3a164d] transition-colors"
              >
                <Mail className="w-4 h-4" />
                Invite someone to join TML Network
              </button>
            </div>
          )}

          {/* Step 2a: Selected network member */}
          {selectedAttorney && selectedAttorney !== 'external' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#3a164d]/5 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a164d] to-[#a47864] flex items-center justify-center text-white font-bold shrink-0">
                  {selectedAttorney.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{selectedAttorney.name}</p>
                  <p className="text-xs text-gray-500">{selectedAttorney.firm_name ? `${selectedAttorney.firm_name} · ` : ''}{selectedAttorney.email}</p>
                </div>
                <button onClick={() => setSelectedAttorney(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
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
              <div className="flex gap-2">
                <TMLButton variant="primary" size="sm" loading={inviting} onClick={handleInviteNetworkMember}>
                  <Mail className="w-4 h-4 mr-1.5" />Send Circle Invitation
                </TMLButton>
                <TMLButton variant="outline" size="sm" onClick={() => setSelectedAttorney(null)}>Back</TMLButton>
              </div>
            </div>
          )}

          {/* Step 2b: External (non-network) invite */}
          {selectedAttorney === 'external' && (
            <form onSubmit={handleInviteExternal} className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <ExternalLink className="w-4 h-4 shrink-0" />
                This attorney isn't on TML yet. We'll send them an email invitation to join the network and this circle.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Email *</label>
                <input
                  required
                  type="email"
                  value={externalEmail}
                  onChange={e => setExternalEmail(e.target.value)}
                  placeholder="attorney@firm.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Name (optional)</label>
                <input
                  type="text"
                  value={externalName}
                  onChange={e => setExternalName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personal Message (optional)</label>
                <textarea
                  rows={2}
                  value={inviteMessage}
                  onChange={e => setInviteMessage(e.target.value)}
                  placeholder="Why you're inviting them..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
              </div>
              <div className="flex gap-2">
                <TMLButton type="submit" variant="primary" size="sm" loading={inviting}>
                  <Mail className="w-4 h-4 mr-1.5" />Send Network Invite
                </TMLButton>
                <TMLButton type="button" variant="outline" size="sm" onClick={() => setSelectedAttorney(null)}>Back</TMLButton>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Pending Join Requests (admin only) */}
      {isAdmin && pendingJoinRequests.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
          <h4 className="font-semibold text-amber-900 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            Pending Join Requests ({pendingJoinRequests.length})
          </h4>
          {pendingJoinRequests.map(req => (
            <div key={req.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-amber-100">
              <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-semibold text-sm shrink-0">
                {(req.full_name || req.user_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{req.full_name || req.user_name || 'Attorney'}</p>
                <p className="text-xs text-gray-500 truncate">{req.user_email}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={async () => { await approveMember(circleId, req.id); refetchPendingJoins(); queryClient.invalidateQueries(['circleMembers']); }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >Accept</button>
                <button
                  onClick={async () => { await denyMember(circleId, req.id); refetchPendingJoins(); }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member List */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {members.map(member => {
          const isMe = member.user_id === user.id;
          const memberIsAdmin = member.role === 'admin';
          const displayName = member.full_name || member.user_name || 'Attorney';
          const initials = displayName.charAt(0)?.toUpperCase() || '?';
          
          return (
            <div key={member.id} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setViewingMember(member)}>
              {member.profile_photo_url ? (
                <img 
                  src={member.profile_photo_url} 
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-gray-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a164d] to-[#a47864] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                   <p className="font-medium text-gray-900 truncate">{displayName} {isMe && <span className="text-gray-400 font-normal text-sm">(you)</span>}</p>
                  <TMLBadge variant={memberIsAdmin ? 'primary' : 'default'} size="sm">
                    {memberIsAdmin && <Shield className="w-3 h-3 mr-1" />}
                    {member.role}
                  </TMLBadge>
                </div>
                <p className="text-sm text-gray-500 truncate">{member.user_email}</p>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                {!isMe && (
                  <button onClick={() => handleDM(member)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors" title="Send direct message">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                {isAdmin && !isMe && (
                  <>
                    {!memberIsAdmin && (
                      <button onClick={() => handlePromote(member)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors" title="Promote to admin">
                        <Shield className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleRemove(member)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove member">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          <div className="px-4 py-2.5 bg-amber-50 rounded-t-xl">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />Waiting to Accept
            </p>
          </div>
          {pendingInvites.map(invite => (
            <div key={invite.id} className="flex items-center gap-3 p-4 opacity-75">
              <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm font-semibold shrink-0">
                {invite.invitee_name?.charAt(0)?.toUpperCase() || invite.invitee_email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-700 truncate">{invite.invitee_name || invite.invitee_email}</p>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">
                    <Clock className="w-3 h-3" />Pending
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate">{invite.invitee_email}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={async () => {
                    await updateInvitation(invite.id, { status: 'declined' });
                    queryClient.invalidateQueries({ queryKey: ['circlePendingInvites', circleId] });
                  }}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Cancel invitation"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

      {viewingMember && (
        <MemberProfileModal member={viewingMember} onClose={() => setViewingMember(null)} />
      )}
    </>
  );
}