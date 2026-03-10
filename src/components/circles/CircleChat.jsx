import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Paperclip, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

export default function CircleChat({ circleId, user, isAdmin, circleName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadMessages();
    const unsubscribe = base44.entities.CircleMessage.subscribe((event) => {
      if (event.data?.circle_id === circleId) {
        if (event.type === 'create') {
          setMessages(prev => [...prev, event.data]);
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
    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    await base44.entities.CircleMessage.create({
      circle_id: circleId,
      sender_user_id: user.id,
      sender_name: user.full_name,
      sender_email: user.email,
      message_text: text,
      is_deleted: false
    });

    // Notify other members (fire and forget)
    base44.functions.invoke('notifyCircleMessage', {
      circle_id: circleId,
      message_text: text,
      circle_name: circleName || 'Legal Circle'
    }).catch(() => null);

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

  // Group messages by sender (consecutive)
  const grouped = visibleMessages.reduce((acc, msg, i) => {
    const prev = visibleMessages[i - 1];
    const isSameSender = prev && prev.sender_user_id === msg.sender_user_id &&
      (new Date(msg.created_date) - new Date(prev.created_date)) < 5 * 60 * 1000;
    acc.push({ ...msg, showHeader: !isSameSender });
    return acc;
  }, []);

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
                      {msg.message_text}
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

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#3a164d] text-white flex items-center justify-center hover:bg-[#2a1038] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}