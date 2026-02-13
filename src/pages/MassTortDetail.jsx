import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  MapPin,
  Clock,
  ExternalLink,
  FileText,
  CheckCircle2,
  Calendar,
  Loader2,
  AlertCircle,
  Mail
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

export default function MassTortDetail() {
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

  // Get lawyer profile
  const { data: profiles = [] } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles[0] || null;

  // Get mass tort
  const { data: massTort, isLoading: massTortLoading } = useQuery({
    queryKey: ['massTort', slug],
    queryFn: async () => {
      const results = await base44.entities.MassTort.filter({ slug, is_published: true });
      return results[0] || null;
    },
    enabled: !!slug,
  });

  // Get related content (articles tagged with matching tags)
  const { data: relatedContent = [] } = useQuery({
    queryKey: ['relatedContent', massTort?.tags],
    queryFn: async () => {
      if (!massTort?.tags || massTort.tags.length === 0) return [];
      const all = await base44.entities.ContentPost.filter({ is_published: true }, '-published_at', 5);
      return all.filter(post => 
        post.tags?.some(tag => massTort.tags.includes(tag))
      ).slice(0, 3);
    },
    enabled: !!massTort,
  });

  if (loading || massTortLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  if (!massTort) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppSidebar user={user} lawyerProfile={lawyerProfile} />
        <main className="ml-64 p-8">
          <div className="max-w-4xl mx-auto text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Mass Tort Not Found</h2>
            <p className="text-gray-600 mb-6">The mass tort you're looking for doesn't exist or has been removed.</p>
            <Link to={createPageUrl('MassTorts')}>
              <TMLButton variant="primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Mass Torts
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
          {/* Back Button */}
          <Link to={createPageUrl('MassTorts')} className="inline-flex items-center text-gray-600 hover:text-[#3a164d] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Mass Torts
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TMLCard variant="elevated" className="mb-6">
              <TMLCardContent className="p-8">
                <div className="flex items-start gap-2 mb-4 flex-wrap">
                  <TMLBadge 
                    variant={
                      massTort.status === 'Open' ? 'success' :
                      massTort.status === 'Monitoring' ? 'warning' :
                      'default'
                    }
                  >
                    {massTort.status}
                  </TMLBadge>
                  <TMLBadge variant="default">
                    <MapPin className="w-3 h-3 mr-1" />
                    {massTort.jurisdiction}
                  </TMLBadge>
                  {(massTort.tags || []).map(tag => (
                    <TMLBadge key={tag} variant="default" size="sm">{tag}</TMLBadge>
                  ))}
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">{massTort.title}</h1>

                {massTort.updated_date && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Last updated {new Date(massTort.updated_date).toLocaleDateString()}</span>
                  </div>
                )}
              </TMLCardContent>
            </TMLCard>
          </motion.div>

          {/* Content */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Overview */}
              {massTort.overview && (
                <TMLCard>
                  <TMLCardHeader>
                    <TMLCardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#3a164d]" />
                      Overview
                    </TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {massTort.overview}
                    </p>
                  </TMLCardContent>
                </TMLCard>
              )}

              {/* Who It's For */}
              {massTort.ideal_cases && (
                <TMLCard>
                  <TMLCardHeader>
                    <TMLCardTitle>Who It's For</TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {massTort.ideal_cases}
                    </p>
                  </TMLCardContent>
                </TMLCard>
              )}

              {/* Key Details */}
              {massTort.key_details && massTort.key_details.length > 0 && (
                <TMLCard>
                  <TMLCardHeader>
                    <TMLCardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#3a164d]" />
                      Key Details
                    </TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent>
                    <ul className="space-y-3">
                      {massTort.key_details.map((detail, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </TMLCardContent>
                </TMLCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Important Dates */}
              {massTort.important_dates && massTort.important_dates.length > 0 && (
                <TMLCard variant="cream">
                  <TMLCardHeader>
                    <TMLCardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#3a164d]" />
                      Important Dates
                    </TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent className="space-y-3">
                    {massTort.important_dates.map((dateItem, index) => (
                      <div key={index} className="pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                        <p className="font-medium text-gray-900">{dateItem.date}</p>
                        <p className="text-sm text-gray-600 mt-1">{dateItem.description}</p>
                      </div>
                    ))}
                  </TMLCardContent>
                </TMLCard>
              )}

              {/* External Resources */}
              {massTort.external_links && massTort.external_links.length > 0 && (
                <TMLCard>
                  <TMLCardHeader>
                    <TMLCardTitle>External Resources</TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent className="space-y-2">
                    {massTort.external_links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#3a164d] hover:underline text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {link.title}
                      </a>
                    ))}
                  </TMLCardContent>
                </TMLCard>
              )}

              {/* Contact CTA */}
              <TMLCard className="border-l-4 border-l-[#3a164d]">
                <TMLCardContent>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#3a164d] mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Questions?</p>
                      <p className="text-sm text-gray-600 mb-3">
                        Contact our team for more information about this mass tort opportunity.
                      </p>
                      <a href="mailto:support@taylormadelaw.com">
                        <TMLButton variant="outline" size="sm">
                          Contact Support
                        </TMLButton>
                      </a>
                    </div>
                  </div>
                </TMLCardContent>
              </TMLCard>
            </div>
          </div>

          {/* Related Content */}
          {relatedContent.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Content</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {relatedContent.map(post => (
                  <Link key={post.id} to={`${createPageUrl('ContentDetail')}?slug=${post.slug}`}>
                    <TMLCard hover className="h-full">
                      <TMLCardContent className="p-4">
                        <TMLBadge variant="primary" size="sm" className="mb-2">
                          {post.category}
                        </TMLBadge>
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
                      </TMLCardContent>
                    </TMLCard>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}