import React from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { listPublishedPosts } from '@/services/content';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, Clock, ArrowLeft, FileText, Download, User, Tag } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import PublicFooter from '@/components/layout/PublicFooter';

export default function PublicBlogDetail() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['publicBlogPost', slug],
    queryFn: async () => {
      const posts = await listPublishedPosts();
      const found = posts.find(p => p.slug === slug || p.id === slug);
      if (!found) throw new Error('Post not found');
      return found;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <PublicNav />
        <div className="flex items-center justify-center pt-32">
          <div className="w-8 h-8 border-4 border-[#3a164d] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (error || !post) {
    return <Navigate to="/Blog" replace />;
  }

  const isWhitePaper = post.category === 'White Paper';
  const readTime = post.read_time_minutes || Math.max(1, Math.ceil((post.body || '').length / 1500));

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <PublicNav />

      {/* Hero */}
      <section className={`pt-32 pb-16 ${isWhitePaper ? 'bg-gradient-to-br from-[#3a164d] to-[#5a2a6d]' : 'bg-gradient-to-br from-[#3a164d] to-[#993333]'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/Blog" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to {isWhitePaper ? 'White Papers' : 'Blog'}
          </Link>

          <span className="inline-block text-xs font-semibold text-[#a47864] uppercase tracking-wider mb-4">
            {isWhitePaper ? 'White Paper' : (post.category || '')}
          </span>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>

          <p className="text-xl text-white/80 mb-8 leading-relaxed">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-white/70 text-sm">
            {post.author_name && (
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium text-white">{post.author_name}</span>
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(post.published_at), 'MMMM d, yyyy')}
              </span>
            )}
            {!isWhitePaper && (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {readTime} min read
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {post.featured_image_url && !isWhitePaper && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <img
            src={post.featured_image_url}
            alt={post.featured_image_alt || post.title}
            className="w-full h-[400px] object-cover rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          {/* PDF Download Banner for White Papers */}
          {isWhitePaper && post.pdf_download_url && (
            <div className="mb-8 p-6 bg-[#f5f0fa] border border-[#3a164d]/20 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#3a164d] rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#3a164d] mb-2">Download PDF Version</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Download this white paper as a PDF for offline reading and reference.
                  </p>
                  <a
                    href={post.pdf_download_url}
                    download={post.pdf_file_name || `${post.slug}.pdf`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#3a164d] hover:bg-[#2a1038] text-white font-semibold rounded-full transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-[#3a164d] hover:prose-a:text-[#2a1038] prose-ul:my-6 prose-ol:my-6"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-gray-400" />
                {post.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            to="/Blog"
            className="inline-flex items-center gap-2 text-[#3a164d] hover:text-[#2a1038] font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {isWhitePaper ? 'White Papers' : 'Blog'}
          </Link>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}