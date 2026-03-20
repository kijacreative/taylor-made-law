import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, MessageSquare, Briefcase, Users, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

const typeIcon = (type) => {
  if (type === 'new_message') return <MessageSquare className="w-4 h-4 text-[#3a164d]" />;
  if (type === 'new_case' || type === 'case_accepted') return <Briefcase className="w-4 h-4 text-[#a47864]" />;
  return <Users className="w-4 h-4 text-blue-500" />;
};

export default function NotificationBell({ user, collapsed }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    loadNotifications();

    const unsub = base44.entities.CircleNotification.subscribe((event) => {
      if (event.data?.user_id === user.id) {
        if (event.type === 'create') {
          setNotifications(prev => [event.data, ...prev]);
        } else if (event.type === 'update') {
          setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
        } else if (event.type === 'delete') {
          setNotifications(prev => prev.filter(n => n.id !== event.id));
        }
      }
    });
    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const loadNotifications = async () => {
    const items = await base44.entities.CircleNotification.filter(
      { user_id: user.id },
      '-created_date',
      30
    ).catch(() => []);
    setNotifications(items);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n =>
      base44.entities.CircleNotification.update(n.id, { is_read: true }).catch(() => null)
    ));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (notif) => {
    if (notif.is_read) return;
    await base44.entities.CircleNotification.update(notif.id, { is_read: true }).catch(() => null);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-gray-50 hover:text-[#3a164d] rounded-xl transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {!collapsed && <span className="font-medium">Notifications</span>}
        {!collapsed && unreadCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#3a164d] hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => { markRead(notif); setOpen(false); }}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                    !notif.is_read ? 'bg-[#3a164d]/5 hover:bg-[#3a164d]/10' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {typeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'} truncate`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatTime(notif.created_date)}</p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-[#3a164d] shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}