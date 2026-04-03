import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { me as getMe } from '@/services/auth';
import { listResources, updateResource, deleteResource, listResourceEvents } from '@/services/content';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit, Trash2, Eye, EyeOff,
  FileText, Link2, Star, StarOff, Filter, Loader2
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';

const STATUS_COLORS = {
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
};
const VIS_LABELS = {
  approved_only: 'Approved Only',
  all_lawyers: 'All Lawyers',
};

export default function AdminResources() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    getMe().then(u => {
      if (!u || u.role !== 'admin') { navigate(createPageUrl('Home')); return; }
      setUser(u);
      setLoading(false);
    }).catch(() => navigate(createPageUrl('Home')));
  }, []);

  const { data: resources = [], isLoading: resLoading } = useQuery({
    queryKey: ['adminResources'],
    queryFn: () => listResources(),
    enabled: !!user,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['resourceEvents'],
    queryFn: () => listResourceEvents(),
    enabled: !!user,
  });

  const eventCounts = events.reduce((acc, e) => {
    acc[e.resource_id] = (acc[e.resource_id] || 0) + 1;
    return acc;
  }, {});

  const categories = [...new Set(resources.map(r => r.category).filter(Boolean))];

  const filtered = resources.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchCat = !filterCategory || r.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  const handleToggleStatus = async (resource) => {
    setToggling(resource.id);
    const newStatus = resource.status === 'published' ? 'draft' : 'published';
    await updateResource(resource.id, {
      status: newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : null
    });
    queryClient.invalidateQueries(['adminResources']);
    setToggling(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await deleteResource(confirmDelete);
    queryClient.invalidateQueries(['adminResources']);
    setConfirmDelete(null);
    setDeleting(false);
  };

  if (loading || resLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 text-[#3a164d] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar user={user} />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Resource Repository</h1>
            <p className="text-gray-400 text-sm mt-1">{resources.length} total resources</p>
          </div>
          <Link to={createPageUrl('AdminResourceEdit')}>
            <button className="flex items-center gap-2 bg-[#3a164d] hover:bg-[#2a1038] text-white px-5 py-2.5 rounded-lg font-semibold transition-colors">
              <Plus className="w-4 h-4" /> New Resource
            </button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="w-full bg-gray-800 text-white pl-9 pr-4 py-2 rounded-lg border border-gray-700 focus:border-[#3a164d] focus:outline-none text-sm"
            />
          </div>
          <select
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none text-sm"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Title</th>
                <th className="text-left px-4 py-4 text-gray-400 font-medium text-sm">Type</th>
                <th className="text-left px-4 py-4 text-gray-400 font-medium text-sm">Category</th>
                <th className="text-left px-4 py-4 text-gray-400 font-medium text-sm">Status</th>
                <th className="text-left px-4 py-4 text-gray-400 font-medium text-sm">Visibility</th>
                <th className="text-left px-4 py-4 text-gray-400 font-medium text-sm">Downloads</th>
                <th className="text-right px-6 py-4 text-gray-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-gray-500">No resources found.</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {r.is_featured && <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                      <span className="text-white font-medium text-sm">{r.title}</span>
                    </div>
                    {r.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {r.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded w-fit ${
                      r.resource_type === 'upload' ? 'bg-blue-900/40 text-blue-300' : 'bg-purple-900/40 text-purple-300'
                    }`}>
                      {r.resource_type === 'upload' ? <FileText className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                      {r.resource_type === 'upload' ? (r.file_type?.toUpperCase() || 'File') : 'Link'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-300 text-sm">{r.category || '—'}</td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-400 text-xs">{VIS_LABELS[r.visibility] || r.visibility}</td>
                  <td className="px-4 py-4 text-gray-400 text-sm">{eventCounts[r.id] || 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleToggleStatus(r)}
                        disabled={toggling === r.id}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title={r.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {toggling === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                          r.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Link to={`${createPageUrl('AdminResourceEdit')}?id=${r.id}`}>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full border border-gray-700">
            <h3 className="text-white font-bold text-lg mb-2">Delete Resource?</h3>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}