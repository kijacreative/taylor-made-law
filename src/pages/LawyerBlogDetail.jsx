import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, Share2, Check, Loader2, Tag, BookOpen } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import BlogCard from '@/components/blog/BlogCard';

const CATEGORY_COLORS = {
  'Updates': 'bg-blue-100 text-blue-700',
  'Education': 'bg-purple-100 text-purple-700',
  'Mass Torts': 'bg-orange-100 text-orange-700',
  'Compliance': 'bg-red-100 text-red-700',
  'Marketing': 'bg-pink-100 text-pink-700',
  'Case Management': 'bg-emerald-100 text-emerald-700',
  'Legal News': 'bg-amber-100 text-amber-700',
};

export default function LawyerBlogDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  const [user, setUser] = useState(null);
  const [lawyerProfile, setLawyerProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('LawyerLogin')); return; }
        const me = await base44.auth.me();
        if (me.role === 'admin') { navigate(createPageUrl('AdminDashboard')); return; }
        setUser(me);
        const profiles = await base44.entities.LawyerProfile.filter({ user_id: me.id });
        if (profiles[0]) setLawyerProfile(profiles[0]);
      } catch { navigate(createPageUrl('LawyerLogin')); }
      finally { setAuthLoading(false); }
    };
    check();
  }, []);

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['blogPost', slug],
    queryFn: async () => {
      const posts = await base44.entities.BlogPost.filter({ slug, status: 'published' });
      return posts[0] || null;
    },
    enabled: !!user && !!slug,
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['publishedBlogPostsForRelated'],
    queryFn: () => base44.entities.BlogPost.filter({ status: 'published' }, '-published_at'),
    enabled: !!user && !!post,
  });

  // Related posts: same category or shared tags, exclude current
  const relatedPosts = allPosts
    .filter(p => p.id !== post?.id && (
      p.category === post?.category ||
      (p.tags || []).some(t => (post?.tags || []).includes(t))
    ))
    .slice(0, 3);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || postLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <AppSidebar user={user} lawyerProfile={lawyerProfile} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-700">Article not found</h2>
            <Link to={createPageUrl('LawyerBlog')} className="mt-4 inline-block text-[#3a164d] hover:underline text-sm">← Back to Blog</Link>
          </div>
        </div>
      </div>
    );
  }

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date(post.created_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const catColor = CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-3xl mx-auto">

            {/* Back */}
            <Link to={createPageUrl('LawyerBlog')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#3a164d] mb-6 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Blog
            </Link>

            {/* Article */}
            <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Featured image */}
              {post.featured_image_url && (
                <div className="w-full h-72 overflow-hidden">
                  <img
                    src={post.featured_image_url}
                    alt={post.featured_image_alt || post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-8 lg:p-10">
                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  {post.category && (
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${catColor}`}>{post.category}</span>
                  )}
                  {post.is_pinned && (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#3a164d] text-white">Pinned</span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />{date}
                  </span>
                  {post.read_time_minutes && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Clock className="w-3.5 h-3.5" />{post.read_time_minutes} min read
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">{post.title}</h1>

                {/* Author */}
                {post.author_name && (
                  <div className="flex items-center gap-2 mb-6 pb-6 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3a164d] to-[#a47864] flex items-center justify-center text-white text-sm font-bold">
                      {post.author_name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{post.author_name}</span>
                  </div>
                )}

                {/* Excerpt */}
                <p className="text-lg text-gray-600 leading-relaxed mb-8 font-medium">{post.excerpt}</p>

                {/* Body */}
                <div
                  className="prose prose-slate max-w-none blog-body"
                  dangerouslySetInnerHTML={{ __html: post.body }}
                />

                <style>{`
                  .blog-body h2 { font-size: 1.5rem; font-weight: 700; margin: 2em 0 0.75em; color: #111827; }
                  .blog-body h3 { font-size: 1.2rem; font-weight: 600; margin: 1.5em 0 0.5em; color: #374151; }
                  .blog-body p { margin-bottom: 1em; line-height: 1.8; color: #374151; }
                  .blog-body ul, .blog-body ol { padding-left: 1.5em; margin-bottom: 1em; }
                  .blog-body li { margin-bottom: 0.4em; line-height: 1.7; color: #374151; }
                  .blog-body blockquote { border-left: 4px solid #3a164d; padding: 12px 20px; background: #f9f5ff; border-radius: 0 12px 12px 0; margin: 1.5em 0; color: #4b5563; font-style: italic; }
                  .blog-body a { color: #3a164d; text-decoration: underline; }
                  .blog-body a:hover { color: #a47864; }
                  .blog-body img { max-width: 100%; border-radius: 12px; margin: 1.5em 0; }
                  .blog-body pre { background: #1e293b; color: #e2e8f0; border-radius: 12px; padding: 20px; overflow-x: auto; margin: 1.5em 0; }
                  .blog-body strong { color: #111827; }
                `}</style>

                {/* Tags + Share */}
                <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
                  {(post.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                      {post.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#3a164d] transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>
            </article>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-10">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Related Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {relatedPosts.map(p => <BlogCard key={p.id} post={p} layout="grid" />)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}