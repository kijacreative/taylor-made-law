import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
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

  const [newMessage, setNewMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate('/login'); return; }
        const userData = await base44.auth.me();
        setUser(userData);
        const profiles = await base44.entities.LawyerProfile.filter({ user_id: userData.id });
        setLawyerProfile(profiles[0] || null);
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
    const res = await base44.functions.invoke('getDirectThread', { thread_id: threadId });
    if (res.data?.error) { navigate('/app/messages'); return; }
    setThreadData(res.data?.thread);
    setOtherParticipant(res.data?.other_participant);
    setMessages(res.data?.messages || []);
    queryClient.invalidateQueries({ queryKey: ['directInbox'] });
  };

  useEffect(() => {
    if (user && threadId) loadThread();
  }, [user, threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!threadId) return;
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.data?.thread_id === threadId) {
        if (event.type === 'create' && !event.data.is_deleted) {
          setMessages(prev => {
            if (prev.find(m => m.id === event.id)) return prev;
            return [...prev, { ...event.data, attachments: [] }];
          });
          // Mark read
          base44.functions.invoke('getDirectThread', { thread_id: threadId }).then(res => {
            queryClient.invalidateQueries({ queryKey: ['directInbox'] });
          }).catch(() => {});
        } else if (event.type === 'update') {
          setMessages(prev => prev.map(m => m.id === event.id ? { ...event.data, attachments: m.attachments } : m));
        }
      }
    });
    return () => unsub();
  }, [threadId]);

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

    try {
      const res = await base44.functions.invoke('sendDirectMessage', { thread_id: threadId, body });
      if (res.data?.error) throw new Error(res.data.error);
      const messageId = res.data?.message?.id;

      // Upload files if any
      if (filesToSend.length > 0 && messageId) {
        const uploadedFiles = [];
        const fileIds = [];
        for (const pf of filesToSend) {
          const fd = new FormData();
          fd.append('file', pf.file);
          fd.append('thread_id', threadId);
          fd.append('message_id', messageId);
          const upRes = await base44.functions.invoke('uploadDirectMessageFile', fd);
          if (upRes.data?.file) {
            uploadedFiles.push(upRes.data.file);
            fileIds.push(upRes.data.file.id);
          }
        }
        if (fileIds.length > 0) {
          await base44.entities.DirectMessage.update(messageId, {
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
    await base44.entities.DirectMessage.update(msg.id, { is_deleted: true, deleted_by: user.email });
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    base44.entities.AuditLog?.create?.({ entity_type: 'DirectMessage', entity_id: msg.id, action: 'direct_message_deleted', actor_email: user.email }).catch?.(() => {});
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

  const otherName = otherParticipant?.user_name || 'Attorney';

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <main className="ml-64 flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0">
          <Link to="/app/messages" className="p-2 rounded-xl text-gray-400 hover:text-[#3a164d] hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-[#a47864] flex items-center justify-center text-white font-semibold">
            {otherName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{otherName}</p>
            <p className="text-xs text-gray-400">{otherParticipant?.user_email || ''}</p>
          </div>
        </div>

        {/* PHI Warning */}
        <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-100 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">Do not share PHI, client names, or sensitive identifiers. This channel is for professional discussion only.</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
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
                  {msg.showHeader && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isMe ? 'bg-[#3a164d]' : 'bg-[#a47864]'}`}>
                      {msg.sender_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  {!msg.showHeader && <div className="w-8 shrink-0" />}
                  <div className={`group max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {msg.showHeader && (
                      <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-semibold text-gray-700">{isMe ? 'You' : msg.sender_name}</span>
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

        {/* Pending file previews */}
        {pendingFiles.length > 0 && (
          <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 flex gap-2 flex-wrap shrink-0">
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

        {sendError && (
          <div className="mx-6 px-4 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 shrink-0">
            {sendError}
          </div>
        )}

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