import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { listPublishedPosts } from '@/services/content';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, Loader2, X, Calendar, Clock, ArrowRight, FileText } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';
import { format } from 'date-fns';

const BLOG_CATEGORIES = ['All', 'Updates', 'Education', 'Mass Torts', 'Compliance', 'Marketing', 'Case Management', 'Legal News'];

function BlogCard({ post, isWhitePaper }) {
  const readTime = post.read_time_minutes || Math.max(1, Math.ceil((post.body || '').length / 1500));
  const slug = post.slug || post.id;

  return (
    <Link to={createPageUrl(`PublicBlogDetail?slug=${slug}`)} className="block group">
      <div className={`bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col ${isWhitePaper ? 'border-[#3a164d]/20' : 'border-gray-100'}`}>
        {post.featured_image_url && !isWhitePaper && (
          <div className="h-48 overflow-hidden">
            <img
              src={post.featured_image_url}
              alt={post.featured_image_alt || post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
        {isWhitePaper && (
          <div className="h-32 bg-gradient-to-br from-[#3a164d] to-[#5a2a6d] flex items-center justify-center">
            <FileText className="w-14 h-14 text-white/60" />
          </div>
        )}
        <div className="p-6 flex flex-col flex-1">
          <span className="text-xs font-semibold text-[#a47864] uppercase tracking-wider mb-2">
            {isWhitePaper ? 'White Paper' : (post.category || '')}
          </span>
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#3a164d] transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
          {isWhitePaper && post.pdf_download_url && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3a164d] bg-[#f5f0fa] px-3 py-1.5 rounded-full">
                <FileText className="w-3 h-3" /> PDF Available
              </span>
            </div>
          )}
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
            {!isWhitePaper && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readTime} min read
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Blog() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialSection = params.get('type') === 'whitepaper' ? 'whitepapers' : 'blog';

  const [section, setSection] = useState(initialSection);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['publicBlogPosts'],
    queryFn: () => listPublishedPosts(),
  });

  const isWhitePaper = section === 'whitepapers';

  const filtered = posts
    .filter(p => {
      if (isWhitePaper) return p.category === 'White Paper';
      // Blog: exclude white papers
      if (p.category === 'White Paper') return false;
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return p.title?.toLowerCase().includes(s) || p.excerpt?.toLowerCase().includes(s) || p.author_name?.toLowerCase().includes(s);
      }
      return true;
    })
    .filter(p => {
      if (!isWhitePaper && search) {
        const s = search.toLowerCase();
        return p.title?.toLowerCase().includes(s) || p.excerpt?.toLowerCase().includes(s) || p.author_name?.toLowerCase().includes(s);
      }
      if (isWhitePaper && search) {
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

  // Remove duplicate filter pass - redo cleanly
  const cleanFiltered = posts
    .filter(p => {
      if (isWhitePaper) {
        if (p.category !== 'White Paper') return false;
      } else {
        if (p.category === 'White Paper') return false;
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      }
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

  const featuredPost = !isWhitePaper ? (cleanFiltered.find(p => p.is_pinned) || cleanFiltered[0]) : null;
  const restPosts = featuredPost ? cleanFiltered.filter(p => p.id !== featuredPost.id) : cleanFiltered;

  const handleSectionSwitch = (s) => {
    setSection(s);
    setSearch('');
    setCategoryFilter('All');
  };

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-[#3a164d] to-[#993333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            {isWhitePaper ? 'White Papers' : 'Blog & Insights'}
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            {isWhitePaper
              ? 'In-depth research and analysis from the Taylor Made Law network.'
              : 'Legal news, educational resources, and updates from the Taylor Made Law network.'}
          </p>

          {/* Section switcher */}
          <div className="flex items-center justify-center gap-1 mt-8 bg-white/10 backdrop-blur-sm rounded-full p-1 w-fit mx-auto">
            <button
              onClick={() => handleSectionSwitch('blog')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${section === 'blog' ? 'bg-white text-[#3a164d]' : 'text-white/80 hover:text-white'}`}
            >
              Blog
            </button>
            <button
              onClick={() => handleSectionSwitch('whitepapers')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${section === 'whitepapers' ? 'bg-white text-[#3a164d]' : 'text-white/80 hover:text-white'}`}
            >
              White Papers
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isWhitePaper ? 'Search white papers...' : 'Search articles...'}
              className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category filters (blog only) */}
        {!isWhitePaper && (
          <div className="flex flex-wrap gap-2 mb-10">
            {BLOG_CATEGORIES.map(cat => (
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
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
          </div>
        ) : cleanFiltered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No {isWhitePaper ? 'white papers' : 'articles'} found.</p>
            {(search || (!isWhitePaper && categoryFilter !== 'All')) && (
              <button onClick={() => { setSearch(''); setCategoryFilter('All'); }} className="mt-3 text-sm text-[#3a164d] hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Featured Post (blog only) */}
            {!isWhitePaper && featuredPost && !search && categoryFilter === 'All' && (
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
              {(!isWhitePaper && !search && categoryFilter === 'All' ? restPosts : cleanFiltered).map(post => (
                <BlogCard key={post.id} post={post} isWhitePaper={isWhitePaper} />
              ))}
            </div>
          </>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}