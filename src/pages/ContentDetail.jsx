import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

export default function ContentDetail() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate(createPageUrl('Home'));
          return;
        }
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        navigate(createPageUrl('Home'));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles[0] || null;

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['contentPost', slug],
    queryFn: async () => {
      const results = await base44.entities.ContentPost.filter({ slug, is_published: true });
      return results[0] || null;
    },
    enabled: !!slug,
  });

  if (loading || postLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppSidebar user={user} lawyerProfile={lawyerProfile} />
        <main className="ml-64 p-8">
          <div className="max-w-4xl mx-auto text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Article Not Found</h2>
            <p className="text-gray-600 mb-6">The article you're looking for doesn't exist or has been removed.</p>
            <Link to={createPageUrl('Content')}>
              <TMLButton variant="primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Content
              </TMLButton>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl('Content')} className="inline-flex items-center text-gray-600 hover:text-[#3a164d] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Content
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TMLCard variant="elevated">
              <TMLCardContent className="p-8">
                <div className="mb-6">
                  <TMLBadge variant="primary" className="mb-4">
                    {post.category}
                  </TMLBadge>
                  
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
                  
                  <div className="flex flex-wrap items-center gap-4 text-gray-500">
                    {post.author_name && (
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {post.author_name}
                      </span>
                    )}
                    {post.published_at && (
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.published_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {post.featured_image_url && (
                  <img 
                    src={post.featured_image_url} 
                    alt={post.title}
                    className="w-full h-64 object-cover rounded-xl mb-8"
                  />
                )}

                <div className="prose prose-lg max-w-none">
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>

                {(post.tags || []).length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </TMLCardContent>
            </TMLCard>
          </motion.div>
        </div>
      </main>
    </div>
  );
}