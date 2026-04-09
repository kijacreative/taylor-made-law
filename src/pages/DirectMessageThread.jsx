import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser, getProfile } from '@/services/auth';
import { getDirectThread, sendDirectMessage, uploadDirectMessageFile, subscribeDirectMessages, updateDirectMessage } from '@/services/messaging';
import { getProfileByUserId } from '@/services/lawyers';
import { createAuditLog } from '@/services/admin';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Send, Paperclip, Loader2, AlertTriangle,
  FileText, FileImage, File, Download, X, Trash2
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';

function getFileIcon(fileType = '') {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.includes('pdf') || fileType.includes('text')) return FileText;
  return File;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageAttachments({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((att, i) => {
        const isImage = att.file_type?.startsWith('image/');
        const Icon = getFileIcon(att.file_type);
        return (
          <div key={i} className="rounded-xl overflow-hidden border border-white/20">
            {isImage ? (
              <a href={att.file_url} target="_blank" rel="noreferrer">
                <img src={att.file_url} alt={att.file_name}
                  className="max-w-[200px] max-h-[150px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity" />
              </a>
            ) : (
              <a href={att.file_url} download={att.file_name} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium transition-colors">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[130px]">{att.file_name}</span>
                <Download className="w-3 h-3 shrink-0 opacity-70" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DirectMessageThreadPage() {
   const navigate = useNavigate();
   const { threadId } = useParams();
   const queryClient = useQueryClient();

   const [user, setUser] = useState(null);
   const [lawyerProfile, setLawyerProfile] = useState(null);
   const [loading, setLoading] = useState(true);
   const [threadData, setThreadData] = useState(null);
   const [messages, setMessages] = useState([]);
   const [otherParticipant, setOtherParticipant] = useState(null);
   // Map of user_id -> full_name from LawyerProfile
   const [userFullNames, setUserFullNames] = useState({});

   const [newMessage, setNewMessage] = useState('');
   const [pendingFiles, setPendingFiles] = useState([]);
   const [sending, setSending] = useState(false);
   const [sendError, setSendError] = useState('');

   const bottomRef = useRef(null);
   const inputRef = useRef(null);
   const fileInputRef = useRef(null);
   const messagesContainerRef = useRef(null);
   const userFullNamesRef = useRef({});

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) { navigate('/login'); return; }
        setUser(userData);
        setLawyerProfile(await getProfile(userData.id));
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const loadThread = async () => {
    if (!threadId) return;
    let res;
    try {
      res = await getDirectThread(threadId);
    } catch {
      navigate('/app/messages');
      return;
    }
    const data = res?.data || res;
    if (data?.error) { navigate('/app/messages'); return; }
    setThreadData(data?.thread)
    const participant = data?.other_participant;
    // Normalize: Supabase returns { id, email, full_name }, Base44 returns { user_id, user_email }
    if (participant) {
      participant.user_id = participant.user_id || participant.id;
      participant.user_email = participant.user_email || participant.email;
      // Use full_name directly if available (Supabase), otherwise fetch from LawyerProfile
      if (!participant.full_name && participant.user_id) {
        try {
          const profile = await getProfileByUserId(participant.user_id);
          if (profile?.full_name) participant.resolved_full_name = profile.full_name;
        } catch {}
      } else if (participant.full_name) {
        participant.resolved_full_name = participant.full_name;
      }
    }
    setOtherParticipant(participant);
    const msgs = data?.messages || [];
    setMessages(msgs);
    // Load full names for all senders
    const uniqueSenders = [...new Set(msgs.map(m => m.sender_user_id))];
    for (const senderId of uniqueSenders) {
      if (!userFullNamesRef.current[senderId]) {
        await loadUserFullName(senderId);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['directInbox'] });
    // Always scroll to bottom on initial load
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
    if (user && threadId) loadThread();
  }, [user, threadId]);

  // Smart scroll: only auto-scroll if user is near the bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Keep ref in sync so subscription closure always has latest names
  useEffect(() => {
    userFullNamesRef.current = userFullNames;
  }, [userFullNames]);

  // Real-time subscription — handles both Supabase Realtime and Base44 event shapes
  useEffect(() => {
    if (!threadId) return;
    const unsub = subscribeDirectMessages((event) => {
      // Normalize: Supabase Realtime = { eventType, new, old }, Base44 = { type, data, id }
      const evType = event.eventType === 'INSERT' ? 'create' : event.eventType === 'UPDATE' ? 'update' : event.type;
      const evData = event.new || event.data;
      const evId = evData?.id || event.id;

      if (evData?.thread_id === threadId) {
        if (evType === 'create' && !evData.deleted_at) {
          setMessages(prev => {
            // Skip if already exists (real msg) or replace optimistic msg from same sender
            if (prev.find(m => m.id === evId)) return prev;
            // Remove matching optimistic message (same sender, close timestamp)
            const withoutOptimistic = prev.filter(m => {
              if (!m._optimistic) return true;
              return m.sender_user_id !== evData.sender_user_id;
            });
            return [...withoutOptimistic, { ...evData, attachments: [] }];
          });
          const senderId = evData?.sender_user_id;
          if (senderId && !userFullNamesRef.current[senderId]) {
            loadUserFullName(senderId);
          }
          queryClient.invalidateQueries({ queryKey: ['directInbox'] });
        } else if (evType === 'update') {
          setMessages(prev => prev.map(m =>
            m.id === evId ? { ...evData, attachments: m.attachments } : m
          ));
        }
      }
    });
    return () => unsub();
  }, [threadId, queryClient]);

  const [userPhotos, setUserPhotos] = useState({});

  const loadUserFullName = async (userId) => {
    try {
      const profile = await getProfileByUserId(userId);
      const fullName = profile?.full_name || 'Attorney';
      setUserFullNames(prev => ({ ...prev, [userId]: fullName }));
      if (profile?.profile_photo_url) {
        setUserPhotos(prev => ({ ...prev, [userId]: profile.profile_photo_url }));
      }
    } catch {
      setUserFullNames(prev => ({ ...prev, [userId]: 'Attorney' }));
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const newPending = files.map(f => ({
      file: f,
      file_name: f.name,
      file_type: f.type,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
    fileInputRef.current.value = '';
  };

  const removePendingFile = (idx) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      if (updated[idx]?.preview) URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingFiles.length === 0) || sending) return;
    setSending(true);
    setSendError('');

    const body = newMessage.trim() || (pendingFiles.length > 0 ? '📎 Attachment' : '');
    setNewMessage('');
    const filesToSend = [...pendingFiles];
    setPendingFiles([]);

    // Optimistic: show message immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      thread_id: threadId,
      sender_user_id: user.id,
      sender_email: user.email,
      body,
      created_at: new Date().toISOString(),
      has_attachments: filesToSend.length > 0,
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const res = await sendDirectMessage({ thread_id: threadId, body });
      const sendData = res?.data || res;
      if (sendData?.error) throw new Error(sendData.error);
      const messageId = sendData?.message?.id;

      // Replace optimistic message with real one
      if (messageId) {
        setMessages(prev => prev.map(m => m.id === optimisticId
          ? { ...m, id: messageId, _optimistic: false }
          : m
        ));
      }

      // Upload files if any
      if (filesToSend.length > 0 && messageId) {
        const uploadedFiles = [];
        const fileIds = [];
        for (const pf of filesToSend) {
          const fd = new FormData();
          fd.append('file', pf.file);
          fd.append('thread_id', threadId);
          fd.append('message_id', messageId);
          const upRes = await uploadDirectMessageFile(fd);
          if (upRes.data?.file) {
            uploadedFiles.push(upRes.data.file);
            fileIds.push(upRes.data.file.id);
          }
        }
        if (fileIds.length > 0) {
          await updateDirectMessage(messageId, {
            has_attachments: true,
            attachment_file_ids: fileIds
          });
          setMessages(prev => prev.map(m => m.id === messageId
            ? { ...m, has_attachments: true, attachments: uploadedFiles }
            : m
          ));
        }
      }
      queryClient.invalidateQueries({ queryKey: ['directInbox'] });
    } catch (err) {
      setSendError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleDelete = async (msg) => {
    if (!window.confirm('Delete this message?')) return;
    await updateDirectMessage(msg.id, { is_deleted: true, deleted_by: user.email });
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    createAuditLog({ entity_type: 'DirectMessage', entity_id: msg.id, action: 'direct_message_deleted', actor_email: user.email }).catch(() => {});
  };

  const visibleMessages = messages.filter(m => !m.is_deleted);

  const grouped = visibleMessages.reduce((acc, msg, i) => {
    const prev = visibleMessages[i - 1];
    const isSameSender = prev && prev.sender_user_id === msg.sender_user_id &&
      (new Date(msg.created_date) - new Date(prev.created_date)) < 5 * 60 * 1000;
    acc.push({ ...msg, showHeader: !isSameSender });
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  const otherName = otherParticipant?.resolved_full_name || userFullNames[otherParticipant?.user_id] || 'Attorney';

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <main className="ml-64 flex flex-col h-screen">
        {/* Header with notifications */}
        <div className="bg-white border-b border-gray-100 shrink-0">
          <div className="px-6 py-4 flex items-center gap-4">
            <Link to="/app/messages" className="p-2 rounded-xl text-gray-400 hover:text-[#3a164d] hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            {otherParticipant?.profile_photo_url ? (
              <img src={otherParticipant.profile_photo_url} alt={otherName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#a47864] flex items-center justify-center text-white font-semibold">
                {otherName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{otherName}</p>
              <p className="text-xs text-gray-400">{otherParticipant?.user_email || otherParticipant?.email || ''}</p>
            </div>
          </div>

          {/* PHI Warning */}
          <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p>Do not share PHI, client names, or sensitive identifiers. This channel is for professional discussion only.</p>
          </div>

          {/* Send error */}
          {sendError && (
            <div className="px-6 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600">
              {sendError}
            </div>
          )}

          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 flex-wrap">
              {pendingFiles.map((pf, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700">
                  {pf.preview ? (
                    <img src={pf.preview} alt="" className="w-7 h-7 object-cover rounded-lg" />
                  ) : (
                    <File className="w-4 h-4 text-[#3a164d]" />
                  )}
                  <span className="truncate max-w-[120px]">{pf.file_name}</span>
                  <button onClick={() => removePendingFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {!threadData ? (
            <div className="flex justify-center pt-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" />
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pt-16">
              <p className="text-gray-400 text-sm">Start the conversation with {otherName}.</p>
            </div>
          ) : (
            grouped.map(msg => {
              const isMe = msg.sender_user_id === user?.id;
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} ${msg.showHeader ? 'mt-5' : 'mt-0.5'}`}>
                  {msg.showHeader && (() => {
                    const senderName = isMe ? (user?.full_name || 'You') : (userFullNames[msg.sender_user_id] || 'Attorney');
                    const senderPhoto = isMe ? user?.profile_photo_url : userPhotos[msg.sender_user_id];
                    return senderPhoto ? (
                      <img src={senderPhoto} alt={senderName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isMe ? 'bg-[#3a164d]' : 'bg-[#a47864]'}`}>
                        {senderName.charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                  {!msg.showHeader && <div className="w-8 shrink-0" />}
                  <div className={`group max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {msg.showHeader && (
                       <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                         <span className="text-xs font-semibold text-gray-700">{isMe ? 'You' : (userFullNames[msg.sender_user_id] || 'Attorney')}</span>
                         <span className="text-xs text-gray-400">{formatTime(msg.created_date)}</span>
                       </div>
                     )}
                    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe ? 'bg-[#3a164d] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                      }`}>
                        <p>{msg.body}</p>
                        <MessageAttachments attachments={msg.attachments} />
                      </div>
                      {isMe && (
                        <button
                          onClick={() => handleDelete(msg)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 mb-1 shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>



        {/* Composer */}
        <form onSubmit={handleSend} className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-[#3a164d] hover:bg-[#3a164d]/10 transition-colors shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={`Message ${otherName}...`}
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d] focus:bg-white"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
            />
            <button
              type="submit"
              disabled={(!newMessage.trim() && pendingFiles.length === 0) || sending}
              className="w-10 h-10 rounded-full bg-[#3a164d] text-white flex items-center justify-center hover:bg-[#2a1038] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}