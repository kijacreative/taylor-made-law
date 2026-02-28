import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, Grid, List, Loader2, X, Calendar, Clock, ArrowRight } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import { format } from 'date-fns';

const CATEGORIES = ['All', 'Updates', 'Education', 'Mass Torts', 'Compliance', 'Marketing', 'Case Management', 'Legal News'];

function BlogCard({ post }) {
  const readTime = post.read_time_minutes || Math.max(1, Math.ceil((post.body || '').length / 1500));
  const slug = post.slug || post.id;

  return (
    <Link to={createPageUrl(`PublicBlogDetail?slug=${slug}`)} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
        {post.featured_image_url && (
          <div className="h-48 overflow-hidden">
            <img
              src={post.featured_image_url}
              alt={post.featured_image_alt || post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
        <div className="p-6 flex flex-col flex-1">
          {post.category && (
            <span className="text-xs font-semibold text-[#a47864] uppercase tracking-wider mb-2">{post.category}</span>
          )}
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#3a164d] transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
          <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-3">
              {post.author_name && <span className="font-medium text-gray-500">{post.author_name}</span>}
              {post.published_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(post.published_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readTime} min read
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Blog() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['publicBlogPosts'],
    queryFn: () => base44.entities.BlogPost.filter({ status: 'published' }, '-published_at'),
  });

  const filtered = posts
    .filter(p => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
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

  const featuredPost = filtered.find(p => p.is_pinned) || filtered[0];
  const restPosts = featuredPost ? filtered.filter(p => p.id !== featuredPost.id) : filtered;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-[#3a164d] to-[#993333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Blog & Insights</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Legal news, educational resources, and updates from the Taylor Made Law network.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Search + Category Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
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

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No articles found.</p>
            {(search || categoryFilter !== 'All') && (
              <button onClick={() => { setSearch(''); setCategoryFilter('All'); }} className="mt-3 text-sm text-[#3a164d] hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && !search && categoryFilter === 'All' && (
              <Link to={createPageUrl(`PublicBlogDetail?slug=${featuredPost.slug || featuredPost.id}`)} className="block mb-12 group">
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 md:flex">
                  {featuredPost.featured_image_url && (
                    <div className="md:w-1/2 h-64 md:h-auto overflow-hidden">
                      <img
                        src={featuredPost.featured_image_url}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-8 md:p-12 flex flex-col justify-center md:w-1/2">
                    {featuredPost.category && (
                      <span className="text-xs font-semibold text-[#a47864] uppercase tracking-wider mb-3">{featuredPost.category}</span>
                    )}
                    <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-[#3a164d] transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed mb-6">{featuredPost.excerpt}</p>
                    <div className="flex items-center gap-2 text-[#3a164d] font-semibold">
                      Read Article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(search || categoryFilter !== 'All' ? filtered : restPosts).map(post => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}