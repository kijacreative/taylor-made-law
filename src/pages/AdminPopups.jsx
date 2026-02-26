import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Edit2, Trash2, Copy, ToggleLeft, ToggleRight, Loader2,
  MousePointerClick, Eye, X, AlertTriangle, Layers, CheckCircle2, Clock
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
};

const PLACEMENT_LABELS = {
  dashboard: 'Dashboard',
  community: 'Community',
  mass_torts: 'Mass Torts',
  blog: 'Blog',
  all_app: 'All App',
};

const AUDIENCE_LABELS = { all: 'All Lawyers', pending: 'Pending Only', approved: 'Approved Only' };
const FREQ_LABELS = { once_ever: 'Once Ever', once_per_day: 'Once/Day', once_per_session: 'Once/Session', every_visit: 'Every Visit' };
const TRIGGER_LABELS = { on_load: 'On Load', delay: 'After Delay', scroll: 'On Scroll' };

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminPopups() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const check = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('Home')); return; }
        const me = await base44.auth.me();
        if (me.role !== 'admin') { navigate(createPageUrl('LawyerDashboard')); return; }
        setUser(me);
      } catch { navigate(createPageUrl('Home')); }
      finally { setAuthLoading(false); }
    };
    check();
  }, []);

  const { data: popups = [], isLoading, refetch } = useQuery({
    queryKey: ['adminPopups'],
    queryFn: () => base44.entities.Popup.list('-created_date'),
    enabled: !!user,
  });

  // Impression counts per popup
  const { data: allImpressions = [] } = useQuery({
    queryKey: ['allPopupImpressions'],
    queryFn: () => base44.entities.PopupImpression.list('-created_date', 500),
    enabled: !!user,
  });

  const impressionsByPopup = {};
  for (const imp of allImpressions) {
    if (!impressionsByPopup[imp.popup_id]) impressionsByPopup[imp.popup_id] = [];
    impressionsByPopup[imp.popup_id].push(imp);
  }

  const handleToggleStatus = async (popup) => {
    setActionLoading(popup.id);
    const newStatus = popup.status === 'active' ? 'inactive' : 'active';
    await base44.entities.Popup.update(popup.id, { status: newStatus });
    showToast(newStatus === 'active' ? `"${popup.name}" activated.` : `"${popup.name}" deactivated.`);
    refetch();
    setActionLoading(null);
  };

  const handleDuplicate = async (popup) => {
    setActionLoading(popup.id + '_dup');
    const { id, created_date, updated_date, created_by, ...rest } = popup;
    await base44.entities.Popup.create({ ...rest, name: `${popup.name} (Copy)`, status: 'draft' });
    showToast('Popup duplicated as draft.');
    refetch();
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.Popup.delete(deleteTarget.id);
    showToast(`"${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
    refetch();
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  const activeCount = popups.filter(p => p.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar user={user} currentPage="AdminPopups" />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pop-up & Promo Manager</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and schedule promotional pop-ups for lawyers.</p>
          </div>
          <div className="flex items-center gap-3">
            {toast && (
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-md border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                <CheckCircle2 className="w-4 h-4" />{toast.msg}
                <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <Link to={createPageUrl('AdminPopupEdit') + '?new=1'}>
              <TMLButton variant="primary" size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Pop-up
              </TMLButton>
            </Link>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{popups.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-100 px-5 py-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-sm text-gray-500">Total Impressions</p>
              <p className="text-2xl font-bold text-gray-900">{allImpressions.length}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
          ) : popups.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
              <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No pop-ups yet.</p>
              <Link to={createPageUrl('AdminPopupEdit') + '?new=1'} className="mt-4 inline-block">
                <TMLButton variant="primary" size="sm">Create your first pop-up</TMLButton>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Name', 'Status', 'Placement', 'Audience', 'Trigger', 'Frequency', 'Impressions / Clicks', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {popups.map(popup => {
                    const imps = impressionsByPopup[popup.id] || [];
                    const clicks = imps.filter(i => i.clicked_at).length;
                    return (
                      <tr key={popup.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{popup.name}</p>
                          {popup.headline && <p className="text-xs text-gray-400 truncate max-w-[180px]">{popup.headline}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[popup.status] || STATUS_STYLES.draft}`}>
                            {popup.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {popup.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{PLACEMENT_LABELS[popup.placement] || popup.placement}</td>
                        <td className="px-5 py-4 text-gray-600">{AUDIENCE_LABELS[popup.audience] || popup.audience}</td>
                        <td className="px-5 py-4 text-gray-600">
                          {TRIGGER_LABELS[popup.trigger_type]}
                          {popup.trigger_type === 'delay' && popup.delay_seconds > 0 && <span className="text-gray-400 text-xs ml-1">({popup.delay_seconds}s)</span>}
                        </td>
                        <td className="px-5 py-4 text-gray-600">{FREQ_LABELS[popup.frequency] || popup.frequency}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-gray-600"><Eye className="w-3.5 h-3.5" />{imps.length}</span>
                            <span className="flex items-center gap-1 text-[#3a164d]"><MousePointerClick className="w-3.5 h-3.5" />{clicks}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <Link to={createPageUrl('AdminPopupEdit') + `?id=${popup.id}`}>
                              <button className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                            </Link>
                            <button
                              onClick={() => handleToggleStatus(popup)}
                              disabled={actionLoading === popup.id}
                              className={`p-1.5 rounded-lg transition-colors ${popup.status === 'active' ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                              title={popup.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {actionLoading === popup.id ? <Loader2 className="w-4 h-4 animate-spin" /> : popup.status === 'active' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDuplicate(popup)}
                              disabled={actionLoading === popup.id + '_dup'}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Duplicate"
                            >
                              {actionLoading === popup.id + '_dup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(popup)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            ><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Pop-up?</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6 bg-gray-50 p-3 rounded-lg">"{deleteTarget.name}"</p>
            <div className="flex gap-3">
              <TMLButton variant="danger" className="flex-1" onClick={handleDelete}>Delete</TMLButton>
              <TMLButton variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</TMLButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}