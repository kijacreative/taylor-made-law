import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser, getProfile } from '@/services/auth';
import { listPublishedPosts } from '@/services/content';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, Grid, List, Loader2, X } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import BlogCard from '@/components/blog/BlogCard';

const CATEGORIES = ['All', 'Updates', 'Education', 'Mass Torts', 'Compliance', 'Marketing', 'Case Management', 'Legal News'];

export default function LawyerBlog() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [lawyerProfile, setLawyerProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('');
  const [layout, setLayout] = useState('grid');

  useEffect(() => {
    const check = async () => {
      try {
        const me = await getCurrentUser();
        if (!me) { navigate(createPageUrl('LawyerLogin')); return; }
        if (me.role === 'admin') { navigate(createPageUrl('AdminDashboard')); return; }
        setUser(me);
        const profile = await getProfile(me.id);
        if (profile) setLawyerProfile(profile);
      } catch { navigate(createPageUrl('LawyerLogin')); }
      finally { setAuthLoading(false); }
    };
    check();
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['publishedBlogPosts'],
    queryFn: () => listPublishedPosts(),
    enabled: !!user,
  });

  // Extract all unique tags from posts
  const allTags = [...new Set(posts.flatMap(p => p.tags || []))].sort();

  const filtered = posts
    .filter(p => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (tagFilter && !(p.tags || []).includes(tagFilter)) return false;
      if (search) {
        const s = search.toLowerCase();
        return p.title?.toLowerCase().includes(s) || p.excerpt?.toLowerCase().includes(s) || p.author_name?.toLowerCase().includes(s);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.published_at || b.created_date) - new Date(a.published_at || a.created_date);
    });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-10">
          <div className="max-w-5xl">
            <h1 className="text-2xl font-bold text-gray-900">Blog & Resources</h1>
            <p className="text-sm text-gray-500 mt-1">Stay informed with the latest updates, guides, and legal insights.</p>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-5xl mx-auto">

            {/* Search + layout toggle */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
                <button onClick={() => setLayout('grid')} className={`p-2 rounded-lg transition-colors ${layout === 'grid' ? 'bg-[#3a164d] text-white' : 'text-gray-400 hover:text-gray-700'}`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setLayout('list')} className={`p-2 rounded-lg transition-colors ${layout === 'list' ? 'bg-[#3a164d] text-white' : 'text-gray-400 hover:text-gray-700'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    categoryFilter === cat
                      ? 'bg-[#3a164d] text-white border-[#3a164d]'
                      : 'text-gray-600 border-gray-200 bg-white hover:border-[#3a164d]/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      tagFilter === tag
                        ? 'bg-[#a47864] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No articles found.</p>
                {(search || categoryFilter !== 'All' || tagFilter) && (
                  <button onClick={() => { setSearch(''); setCategoryFilter('All'); setTagFilter(''); }} className="mt-3 text-sm text-[#3a164d] hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
            ) : layout === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(post => <BlogCard key={post.id} post={post} layout="grid" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(post => <BlogCard key={post.id} post={post} layout="list" />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}