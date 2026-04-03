import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser } from '@/services/auth';
import { listBlogPosts, updateBlogPost, createBlogPost, deleteBlogPost } from '@/services/content';
import { createAuditLog } from '@/services/admin';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit2, Trash2, Eye, EyeOff, Copy,
  CheckCircle2, XCircle, Clock, Loader2, BookOpen,
  Pin, LayoutDashboard, X, AlertTriangle
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLBadge from '@/components/ui/TMLBadge';

const CATEGORIES = ['All', 'Updates', 'Education', 'Mass Torts', 'Compliance', 'Marketing', 'Case Management', 'Legal News'];

const CATEGORY_COLORS = {
  'Updates': 'bg-blue-100 text-blue-700',
  'Education': 'bg-purple-100 text-purple-700',
  'Mass Torts': 'bg-orange-100 text-orange-700',
  'Compliance': 'bg-red-100 text-red-700',
  'Marketing': 'bg-pink-100 text-pink-700',
  'Case Management': 'bg-emerald-100 text-emerald-700',
  'Legal News': 'bg-amber-100 text-amber-700',
};

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminBlog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
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
        const me = await getCurrentUser();
        if (!me) { navigate(createPageUrl('Home')); return; }
        if (me.role !== 'admin') { navigate(createPageUrl('LawyerDashboard')); return; }
        setUser(me);
      } catch { navigate(createPageUrl('Home')); }
      finally { setAuthLoading(false); }
    };
    check();
  }, []);

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['adminBlogPosts'],
    queryFn: () => listBlogPosts(),
    enabled: !!user,
  });

  const filtered = posts.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.title?.toLowerCase().includes(s) || p.excerpt?.toLowerCase().includes(s) || p.tags?.some(t => t.toLowerCase().includes(s));
    }
    return true;
  });

  const handleTogglePublish = async (post) => {
    setActionLoading(post.id);
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    await updateBlogPost(post.id, {
      status: newStatus,
      ...(newStatus === 'published' ? { published_at: new Date().toISOString(), published_by: user.email } : {})
    });
    await createAuditLog({
      entity_type: 'BlogPost', entity_id: post.id,
      action: newStatus === 'published' ? 'blog_published' : 'blog_unpublished',
      actor_email: user.email
    }).catch(() => {});
    showToast(newStatus === 'published' ? `"${post.title}" published!` : `"${post.title}" moved to draft.`);
    refetch();
    setActionLoading(null);
  };

  const handleDuplicate = async (post) => {
    setActionLoading(post.id + '_dup');
    const { id, created_date, updated_date, created_by, ...rest } = post;
    await createBlogPost({
      ...rest,
      title: `${post.title} (Copy)`,
      slug: slugify(`${post.title}-copy-${Date.now()}`),
      status: 'draft',
      published_at: null,
      published_by: null,
    });
    showToast('Post duplicated as draft.');
    refetch();
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteBlogPost(deleteTarget.id);
    await createAuditLog({
      entity_type: 'BlogPost', entity_id: deleteTarget.id,
      action: 'blog_deleted', actor_email: user.email
    }).catch(() => {});
    showToast(`"${deleteTarget.title}" deleted.`);
    setDeleteTarget(null);
    refetch();
  };

  const counts = { all: posts.length, published: posts.filter(p => p.status === 'published').length, draft: posts.filter(p => p.status === 'draft').length };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar user={user} currentPage="AdminBlog" />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog & Resources</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and manage published content for attorneys.</p>
          </div>
          <div className="flex items-center gap-3">
            {toast && (
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-md ${
                toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {toast.msg}
                <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <Link to={createPageUrl('AdminBlogEdit') + '?new=1'}>
              <TMLButton variant="primary" size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Post
              </TMLButton>
            </Link>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Posts', count: counts.all, color: 'border-gray-100' },
              { label: 'Published', count: counts.published, color: 'border-emerald-100' },
              { label: 'Drafts', count: counts.draft, color: 'border-amber-100' },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-xl border px-5 py-4 ${s.color}`}>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {/* Status tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {['all', 'published', 'draft'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${statusFilter === s ? 'bg-[#3a164d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {s} <span className="ml-1 text-xs opacity-70">({counts[s] ?? 0})</span>
                </button>
              ))}
            </div>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>

            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No posts found.</p>
              <Link to={createPageUrl('AdminBlogEdit') + '?new=1'} className="mt-4 inline-block">
                <TMLButton variant="primary" size="sm">Create your first post</TMLButton>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Author</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Published</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Updated</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(post => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {post.is_pinned && <Pin className="w-3.5 h-3.5 text-[#3a164d]" />}
                          {post.feature_on_dashboard && <LayoutDashboard className="w-3.5 h-3.5 text-[#a47864]" />}
                          <div>
                            <p className="font-semibold text-gray-900 line-clamp-1">{post.title}</p>
                            <p className="text-xs text-gray-400 font-mono">{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          post.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {post.status === 'published' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {post.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        {post.category && (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-600'}`}>{post.category}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-gray-600">{post.author_name || '—'}</td>
                      <td className="px-5 py-4 hidden xl:table-cell text-gray-500 text-xs">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-4 hidden xl:table-cell text-gray-500 text-xs">
                        {new Date(post.updated_date || post.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={createPageUrl('AdminBlogEdit') + `?id=${post.id}`}>
                            <button className="p-1.5 rounded-lg text-gray-400 hover:text-[#3a164d] hover:bg-gray-100 transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleTogglePublish(post)}
                            disabled={actionLoading === post.id}
                            className={`p-1.5 rounded-lg transition-colors ${
                              post.status === 'published'
                                ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                          >
                            {actionLoading === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : post.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDuplicate(post)}
                            disabled={actionLoading === post.id + '_dup'}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Duplicate"
                          >
                            {actionLoading === post.id + '_dup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(post)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
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
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Post?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6 bg-gray-50 p-3 rounded-lg">"{deleteTarget.title}"</p>
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