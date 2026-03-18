import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Search, Plus, Loader2, Lock, ChevronRight } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import NewMessageModal from '@/components/messages/NewMessageModal';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function DirectMessages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate('/login'); return; }
        const userData = await base44.auth.me();
        setUser(userData);
        // Check approved status
        const profiles = await base44.entities.LawyerProfile.filter({ user_id: userData.id });
        setIsApproved(profiles[0]?.status === 'approved');
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });
  const lawyerProfile = profiles[0] || null;

  const { data: inboxData, isLoading: inboxLoading, refetch } = useQuery({
    queryKey: ['directInbox', user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getDirectInbox', {});
      return res.data;
    },
    enabled: !!user && isApproved,
    refetchInterval: 20000,
  });

  const threads = inboxData?.threads || [];

  const filtered = threads.filter(t =>
    !search || t.other_user_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.other_user_email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleThreadOpen = (threadId) => {
    navigate(`/app/messages/${threadId}`);
  };

  const handleNewMessageStart = async (recipientUserId) => {
    setShowNewMessage(false);
    try {
      const res = await base44.functions.invoke('startDirectThread', { recipient_user_id: recipientUserId });
      if (res.data?.thread_id) {
        queryClient.invalidateQueries({ queryKey: ['directInbox'] });
        navigate(`/app/messages/${res.data.thread_id}`);
      }
    } catch (err) {
      alert('Could not start conversation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      {showNewMessage && (
        <NewMessageModal
          currentUserId={user?.id}
          onSelect={handleNewMessageStart}
          onClose={() => setShowNewMessage(false)}
        />
      )}

      <main className="ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-[#3a164d]" />
                Direct Messages
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Private conversations with attorneys in the TML network</p>
            </div>
            {isApproved && (
              <button
                onClick={() => setShowNewMessage(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#3a164d] text-white rounded-xl text-sm font-medium hover:bg-[#2a1038] transition-colors"
              >
                <Plus className="w-4 h-4" />New Message
              </button>
            )}
          </div>

          {!isApproved ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Messaging Requires Approval</h2>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Direct messaging is available to approved attorneys in the TML network. Your account is currently under review.
              </p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
              </div>

              {inboxLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-[#3a164d]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h2 className="font-semibold text-gray-900 mb-1">
                    {search ? `No results for "${search}"` : 'No messages yet'}
                  </h2>
                  <p className="text-gray-400 text-sm mb-5">
                    {!search && 'Start a conversation with another attorney in the network.'}
                  </p>
                  {!search && (
                    <button
                      onClick={() => setShowNewMessage(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#3a164d] text-white rounded-xl text-sm font-medium hover:bg-[#2a1038] transition-colors"
                    >
                      <Plus className="w-4 h-4" />Start a Conversation
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                  {filtered.map(thread => (
                    <button
                      key={thread.thread_id}
                      onClick={() => handleThreadOpen(thread.thread_id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
                    >
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${thread.is_unread ? 'bg-[#3a164d]' : 'bg-[#a47864]'}`}>
                        {thread.other_user_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${thread.is_unread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                            {thread.other_user_name}
                          </span>
                          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                            {formatRelativeTime(thread.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className={`text-sm truncate ${thread.is_unread ? 'font-medium text-gray-700' : 'text-gray-400'}`}>
                            {thread.last_message_sender_id === user?.id ? 'You: ' : ''}
                            {thread.last_message_preview || 'No messages yet'}
                          </p>
                          {thread.is_unread && (
                            <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-[#3a164d]" />
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}