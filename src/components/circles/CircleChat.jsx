import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Send, Paperclip, AlertTriangle, Trash2, Loader2,
  FileImage, FileText, File, X, Download
} from 'lucide-react';

function getFileIcon(fileType = '') {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.includes('pdf') || fileType.includes('text')) return FileText;
  return File;
}

function AttachmentPreview({ attachment, onRemove }) {
  const isImage = attachment.file_type?.startsWith('image/');
  return (
    <div className="relative flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm group max-w-[180px]">
      {isImage ? (
        <img src={attachment.preview || attachment.file_url} alt={attachment.file_name}
          className="w-8 h-8 object-cover rounded-lg shrink-0" />
      ) : (
        <div className="w-8 h-8 bg-[#3a164d]/10 rounded-lg flex items-center justify-center shrink-0">
          {React.createElement(getFileIcon(attachment.file_type), { className: 'w-4 h-4 text-[#3a164d]' })}
        </div>
      )}
      <span className="text-xs text-gray-700 truncate flex-1">{attachment.file_name}</span>
      {onRemove && (
        <button onClick={onRemove} className="shrink-0 w-4 h-4 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

function MessageAttachments({ attachments }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((att, i) => {
        const isImage = att.file_type?.startsWith('image/');
        return (
          <div key={i} className="rounded-xl overflow-hidden border border-white/20">
            {isImage ? (
              <a href={att.file_url} target="_blank" rel="noreferrer">
                <img src={att.file_url} alt={att.file_name}
                  className="max-w-[200px] max-h-[160px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity" />
              </a>
            ) : (
              <a href={att.file_url} download={att.file_name} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-xs font-medium text-current">
                {React.createElement(getFileIcon(att.file_type), { className: 'w-4 h-4 shrink-0' })}
                <span className="truncate max-w-[140px]">{att.file_name}</span>
                <Download className="w-3 h-3 shrink-0 opacity-60" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CircleChat({ circleId, user, isAdmin, circleName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]); // {file, preview, file_name, file_type}
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  // Map of message_id -> [CircleFile] for attachments
  const [fileMap, setFileMap] = useState({});
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadMessages();
    const unsubscribe = base44.entities.CircleMessage.subscribe((event) => {
      if (event.data?.circle_id === circleId) {
        if (event.type === 'create') {
          setMessages(prev => [...prev, event.data]);
          // If has attachments, reload file map
          if (event.data?.has_attachments) {
            loadFilesForMessages([event.data]);
          }
        } else if (event.type === 'update') {
          setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        } else if (event.type === 'delete') {
          setMessages(prev => prev.filter(m => m.id !== event.id));
        }
      }
    });
    return () => unsubscribe();
  }, [circleId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const msgs = await base44.entities.CircleMessage.filter(
      { circle_id: circleId, is_deleted: false },
      'created_date',
      100
    );
    setMessages(msgs);
    const withAttachments = msgs.filter(m => m.has_attachments);
    if (withAttachments.length > 0) await loadFilesForMessages(withAttachments);
    setLoading(false);
  };

  const loadFilesForMessages = async (msgs) => {
    const msgIds = msgs.map(m => m.id);
    // Fetch all CircleFiles for this circle (filter by message_id)
    const files = await base44.entities.CircleFile.filter(
      { circle_id: circleId, is_deleted: false },
      'created_date',
      500
    );
    const newMap = {};
    files.forEach(f => {
      if (f.message_id && msgIds.includes(f.message_id)) {
        if (!newMap[f.message_id]) newMap[f.message_id] = [];
        newMap[f.message_id].push(f);
      }
    });
    setFileMap(prev => ({ ...prev, ...newMap }));
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

    const text = newMessage.trim();
    setNewMessage('');
    const filesToSend = [...pendingFiles];
    setPendingFiles([]);

    // Get lawyer profile for full_name
    const lawyerProfiles = await base44.entities.LawyerProfile.list();
    const profile = lawyerProfiles.find(p => p.user_id === user.id);
    const senderFullName = profile?.full_name || user.full_name || 'Attorney';

    // Create message first
    const msg = await base44.entities.CircleMessage.create({
      circle_id: circleId,
      sender_user_id: user.id,
      sender_name: senderFullName,
      sender_full_name: senderFullName,
      sender_email: user.email,
      message_text: text || '',
      has_attachments: filesToSend.length > 0,
      is_deleted: false
    });

    // Upload each file and create CircleFile records
    if (filesToSend.length > 0 && msg?.id) {
      const uploadedFileIds = [];
      const uploadedFiles = [];
      for (const pending of filesToSend) {
        try {
          const fd = new FormData();
          fd.append('file', pending.file);
          fd.append('circle_id', circleId);
          fd.append('message_id', msg.id);
          const res = await base44.functions.invoke('uploadCircleFile', fd);
          if (res.data?.file) {
            uploadedFileIds.push(res.data.file.id);
            uploadedFiles.push(res.data.file);
          }
        } catch {
          // best effort per file
        }
      }
      // Update message with file IDs
      if (uploadedFileIds.length > 0) {
        await base44.entities.CircleMessage.update(msg.id, {
          attachment_file_ids: uploadedFileIds
        });
      }
      // Update local file map immediately
      if (uploadedFiles.length > 0) {
        setFileMap(prev => ({
          ...prev,
          [msg.id]: uploadedFiles
        }));
      }
      // Invalidate resources query
      queryClient.invalidateQueries({ queryKey: ['circleFiles', circleId] });
    }

    // Notify other members (fire and forget)
    if (text) {
      base44.functions.invoke('notifyCircleMessage', {
        circle_id: circleId,
        message_text: text,
        circle_name: circleName || 'Legal Circle'
      }).catch(() => null);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleDelete = async (msg) => {
    if (!window.confirm('Remove this message?')) return;
    await base44.entities.CircleMessage.update(msg.id, {
      is_deleted: true,
      deleted_by: user.email
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const visibleMessages = messages.filter(m => !m.is_deleted);

  const grouped = visibleMessages.reduce((acc, msg, i) => {
    const prev = visibleMessages[i - 1];
    const isSameSender = prev && prev.sender_user_id === msg.sender_user_id &&
      (new Date(msg.created_date) - new Date(prev.created_date)) < 5 * 60 * 1000;
    acc.push({ ...msg, showHeader: !isSameSender });
    return acc;
  }, []);

  const canSend = (newMessage.trim() || pendingFiles.length > 0) && !sending;

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* PHI Warning */}
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700">Do not share PHI, client names, or sensitive identifiers in chat. This channel is for professional discussion only.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" />
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          grouped.map((msg) => {
            const isMe = msg.sender_user_id === user.id;
            const attachments = fileMap[msg.id] || [];
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} ${msg.showHeader ? 'mt-4' : 'mt-0.5'}`}>
                {msg.showHeader && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isMe ? 'bg-[#3a164d]' : 'bg-[#a47864]'}`}>
                    {msg.sender_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                {!msg.showHeader && <div className="w-8 shrink-0" />}
                <div className={`group max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {msg.showHeader && (
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-gray-700">{isMe ? 'You' : msg.sender_name}</span>
                      <span className="text-xs text-gray-400">{formatTime(msg.created_date)}</span>
                    </div>
                  )}
                  <div className={`relative flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-[#3a164d] text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}>
                      {msg.message_text && <p>{msg.message_text}</p>}
                      <MessageAttachments attachments={attachments} />
                    </div>
                    {(isAdmin || isMe) && (
                      <button
                        onClick={() => handleDelete(msg)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0 self-center"
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
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex gap-2 flex-wrap">
          {pendingFiles.map((pf, i) => (
            <AttachmentPreview key={i} attachment={pf} onRemove={() => removePendingFile(i)} />
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-gray-50">
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
            placeholder={pendingFiles.length > 0 ? 'Add a caption...' : 'Type a message...'}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="w-10 h-10 rounded-full bg-[#3a164d] text-white flex items-center justify-center hover:bg-[#2a1038] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}