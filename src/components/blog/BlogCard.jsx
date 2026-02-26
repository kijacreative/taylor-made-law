import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Calendar, Clock, Tag } from 'lucide-react';

const CATEGORY_COLORS = {
  'Updates': 'bg-blue-100 text-blue-700',
  'Education': 'bg-purple-100 text-purple-700',
  'Mass Torts': 'bg-orange-100 text-orange-700',
  'Compliance': 'bg-red-100 text-red-700',
  'Marketing': 'bg-pink-100 text-pink-700',
  'Case Management': 'bg-emerald-100 text-emerald-700',
  'Legal News': 'bg-amber-100 text-amber-700',
};

export default function BlogCard({ post, layout = 'grid' }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date(post.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const catColor = CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-700';

  if (layout === 'list') {
    return (
      <Link to={createPageUrl('LawyerBlogDetail') + `?slug=${post.slug}`} className="group">
        <div className="flex gap-5 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-[#3a164d]/20 transition-all duration-200 p-4">
          {post.featured_image_url && (
            <div className="w-32 h-24 rounded-xl overflow-hidden shrink-0">
              <img
                src={post.featured_image_url}
                alt={post.featured_image_alt || post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {post.category && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColor}`}>{post.category}</span>
              )}
              {post.is_pinned && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#3a164d] text-white">Pinned</span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 group-hover:text-[#3a164d] transition-colors line-clamp-2 mb-1">{post.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2 mb-2">{post.excerpt}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
              {post.read_time_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time_minutes} min read</span>}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={createPageUrl('LawyerBlogDetail') + `?slug=${post.slug}`} className="group">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#3a164d]/20 transition-all duration-200 h-full flex flex-col">
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {post.featured_image_url ? (
            <img
              src={post.featured_image_url}
              alt={post.featured_image_alt || post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#3a164d]/10 to-[#a47864]/10 flex items-center justify-center">
              <Tag className="w-10 h-10 text-[#3a164d]/30" />
            </div>
          )}
          {post.is_pinned && (
            <div className="absolute top-3 left-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#3a164d] text-white shadow">Pinned</span>
            </div>
          )}
          {post.category && (
            <div className="absolute top-3 right-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shadow ${catColor}`}>{post.category}</span>
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-bold text-gray-900 group-hover:text-[#3a164d] transition-colors line-clamp-2 mb-2 text-lg leading-snug">{post.title}</h3>
          <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">{post.excerpt}</p>
          {(post.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
              {post.tags.length > 3 && <span className="text-xs text-gray-400">+{post.tags.length - 3}</span>}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
            <span className="flex items-center gap-1 text-[#3a164d] font-medium">
              {post.read_time_minutes ? `${post.read_time_minutes} min read` : post.author_name}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}