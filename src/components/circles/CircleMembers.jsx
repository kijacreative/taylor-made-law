import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, Shield, Trash2, Mail, Search, Loader2, CheckCircle, Users, ExternalLink, X } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLBadge from '@/components/ui/TMLBadge';

export default function CircleMembers({ circleId, members, user, isAdmin, circleName }) {
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
  const queryClient = useQueryClient();
  const searchTimeout = useRef(null);

  const memberEmails = new Set(members.map(m => m.user_email));

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await base44.functions.invoke('searchNetworkAttorneys', { query: searchQuery });
        setSearchResults(res.data?.results || []);
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
      const res = await base44.functions.invoke('createCircleInvitation', {
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
      await base44.functions.invoke('sendCircleInviteEmail', {
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

      {/* Member List */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {members.map(member => {
          const isMe = member.user_id === user.id;
          const memberIsAdmin = member.role === 'admin';
          return (
            <div key={member.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a164d] to-[#a47864] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {member.full_name?.charAt(0)?.toUpperCase() || member.user_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">{member.user_name} {isMe && <span className="text-gray-400 font-normal text-sm">(you)</span>}</p>
                  <TMLBadge variant={memberIsAdmin ? 'primary' : 'default'} size="sm">
                    {memberIsAdmin && <Shield className="w-3 h-3 mr-1" />}
                    {member.role}
                  </TMLBadge>
                </div>
                <p className="text-sm text-gray-500 truncate">{member.user_email}</p>
              </div>
              {isAdmin && !isMe && (
                <div className="flex gap-1">
                  {!memberIsAdmin && (
                    <button onClick={() => handlePromote(member)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/5 transition-colors" title="Promote to admin">
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleRemove(member)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove member">
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