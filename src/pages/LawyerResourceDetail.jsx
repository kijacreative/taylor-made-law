import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Download, ExternalLink, Lock,
  Star, FileText, Link2, Tag, Calendar, Loader2
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function LawyerResourceDetail() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSlug(params.get('slug') || '');
    base44.auth.me().then(async u => {
      if (!u) { navigate(createPageUrl('LawyerLogin')); return; }
      setUser(u);
      const profiles = await base44.entities.LawyerProfile.filter({ user_id: u.id });
      if (profiles?.[0]) setProfile(profiles[0]);
      setLoading(false);
    }).catch(() => navigate(createPageUrl('LawyerLogin')));
  }, []);

  const { data: resources = [], isLoading: resLoading } = useQuery({
    queryKey: ['resourceDetail', slug],
    queryFn: () => base44.entities.Resource.filter({ slug, status: 'published' }),
    enabled: !!user && !!slug,
  });

  const { data: allResources = [] } = useQuery({
    queryKey: ['allResourcesForRelated'],
    queryFn: () => base44.entities.Resource.filter({ status: 'published' }, '-updated_date', 50),
    enabled: !!user,
  });

  const resource = resources[0];
  const isApproved = profile?.status === 'approved';
  const locked = resource?.visibility === 'approved_only' && !isApproved;

  const related = resource
    ? allResources.filter(r =>
        r.id !== resource.id &&
        (r.category === resource.category || (r.tags || []).some(t => (resource.tags || []).includes(t))) &&
        (r.visibility === 'all_lawyers' || isApproved)
      ).slice(0, 3)
    : [];

  const trackEvent = async (actionType) => {
    if (!user || !resource) return;
    await base44.entities.ResourceEvent.create({
      resource_id: resource.id,
      user_id: user.id,
      user_email: user.email,
      action_type: actionType,
    });
  };

  if (loading || resLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-[#3a164d] animate-spin" />
    </div>
  );

  if (!resource) return (
    <div className="flex min-h-screen bg-[#faf8f5]">
      <AppSidebar user={user} lawyerProfile={profile} />
      <main className="flex-1 ml-64 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Resource not found.</p>
          <Link to={createPageUrl('LawyerResources')}>
            <button className="text-[#3a164d] font-medium hover:underline">← Back to Library</button>
          </Link>
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#faf8f5]">
      <AppSidebar user={user} lawyerProfile={profile} />
      <main className="flex-1 ml-64 p-8 max-w-5xl">
        <Link to={createPageUrl('LawyerResources')}>
          <button className="flex items-center gap-2 text-gray-500 hover:text-[#3a164d] mb-6 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Library
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase ${
                  resource.resource_type === 'external_link'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {resource.resource_type === 'external_link' ? 'External Link' : (resource.file_type?.toUpperCase() || 'File')}
                </span>
                {resource.category && (
                  <span className="text-xs font-medium text-[#3a164d] bg-[#3a164d]/10 px-3 py-1 rounded-full">{resource.category}</span>
                )}
                {resource.is_featured && (
                  <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                    <Star className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">{resource.title}</h1>

              {resource.description && (
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">{resource.description}</div>
              )}

              {resource.tags?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-6">
                  <Tag className="w-4 h-4 text-gray-400" />
                  {resource.tags.map(t => (
                    <span key={t} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              )}

              {locked ? (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-amber-800">Approval Required</p>
                    <p className="text-amber-700 text-sm">This resource is available to approved attorneys only.</p>
                  </div>
                </div>
              ) : resource.resource_type === 'upload' ? (
                <a
                  href={resource.file_url} target="_blank" rel="noreferrer"
                  onClick={() => trackEvent('download')}
                  className="inline-flex items-center gap-2 bg-[#3a164d] hover:bg-[#2a1038] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base"
                >
                  <Download className="w-5 h-5" /> Download {resource.file_type?.toUpperCase() || 'File'}
                </a>
              ) : (
                <a
                  href={resource.external_url}
                  target={resource.external_new_tab ? '_blank' : '_self'}
                  rel="noreferrer"
                  onClick={() => trackEvent('open_link')}
                  className="inline-flex items-center gap-2 bg-[#3a164d] hover:bg-[#2a1038] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base"
                >
                  <ExternalLink className="w-5 h-5" /> Open Resource
                </a>
              )}
            </div>
          </div>

          {/* Sidebar meta */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">File Info</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-400 text-xs">Type</dt>
                  <dd className="text-gray-700 font-medium capitalize">{resource.resource_type === 'external_link' ? 'External Link' : (resource.file_type?.toUpperCase() || 'File Upload')}</dd>
                </div>
                {resource.file_size > 0 && (
                  <div>
                    <dt className="text-gray-400 text-xs">Size</dt>
                    <dd className="text-gray-700 font-medium">{formatBytes(resource.file_size)}</dd>
                  </div>
                )}
                {resource.file_name && (
                  <div>
                    <dt className="text-gray-400 text-xs">File Name</dt>
                    <dd className="text-gray-700 font-medium truncate">{resource.file_name}</dd>
                  </div>
                )}
                {resource.published_at && (
                  <div>
                    <dt className="text-gray-400 text-xs">Published</dt>
                    <dd className="text-gray-700 font-medium">{new Date(resource.published_at).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </div>

            {related.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">Related Resources</h3>
                <div className="space-y-3">
                  {related.map(r => (
                    <Link key={r.id} to={`${createPageUrl('LawyerResourceDetail')}?slug=${r.slug}`}>
                      <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        {r.resource_type === 'external_link' ? <Link2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" /> : <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                        <p className="text-sm text-gray-700 font-medium line-clamp-2">{r.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}