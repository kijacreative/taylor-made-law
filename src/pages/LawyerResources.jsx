import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Search, FileText, Link2, Download, ExternalLink,
  Lock, Star, Filter, BookOpen, Loader2
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';

const TYPE_COLORS = {
  pdf:  'bg-red-100 text-red-700',
  docx: 'bg-blue-100 text-blue-700',
  xlsx: 'bg-emerald-100 text-emerald-700',
  pptx: 'bg-orange-100 text-orange-700',
  zip:  'bg-gray-100 text-gray-600',
  link: 'bg-purple-100 text-purple-700',
};

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function LawyerResources() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    base44.auth.me().then(async u => {
      if (!u) { navigate(createPageUrl('LawyerLogin')); return; }
      setUser(u);
      const profiles = await base44.entities.LawyerProfile.filter({ user_id: u.id });
      if (profiles?.[0]) setProfile(profiles[0]);
      setLoading(false);
    }).catch(() => navigate(createPageUrl('LawyerLogin')));
  }, []);

  const isApproved = profile?.status === 'approved';

  const { data: resources = [], isLoading: resLoading } = useQuery({
    queryKey: ['lawyerResources'],
    queryFn: () => base44.entities.Resource.filter({ status: 'published' }, '-updated_date', 200),
    enabled: !!user,
  });

  const visibleResources = resources.filter(r =>
    r.visibility === 'all_lawyers' || (r.visibility === 'approved_only' && isApproved) || r.visibility === 'approved_only'
  );

  const categories = [...new Set(visibleResources.map(r => r.category).filter(Boolean))];
  const allTags = [...new Set(visibleResources.flatMap(r => r.tags || []))];

  let filtered = visibleResources.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    const matchCat = !filterCategory || r.category === filterCategory;
    const matchTag = !filterTag || (r.tags || []).includes(filterTag);
    return matchSearch && matchCat && matchTag;
  });

  if (sort === 'az') filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));

  const trackEvent = async (resource, actionType) => {
    if (!user) return;
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

  return (
    <div className="flex min-h-screen bg-[#faf8f5]">
      <AppSidebar user={user} lawyerProfile={profile} />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-7 h-7 text-[#3a164d]" />
            <h1 className="text-3xl font-bold text-gray-900">Resource Library</h1>
          </div>
          <p className="text-gray-500">Guides, templates, and resources for your practice.</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search resources…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#3a164d] focus:outline-none text-sm"
            />
          </div>
          <select
            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none text-sm text-gray-700"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {allTags.length > 0 && (
            <select
              value={filterTag} onChange={e => setFilterTag(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none text-sm text-gray-700"
            >
              <option value="">All Tags</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <select
            value={sort} onChange={e => setSort(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none text-sm text-gray-700"
          >
            <option value="recent">Most Recent</option>
            <option value="az">A–Z</option>
          </select>
        </div>

        {/* Grid */}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No resources found.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(r => {
            const locked = r.visibility === 'approved_only' && !isApproved;
            const typeLabel = r.resource_type === 'external_link' ? 'link' : (r.file_type || 'file');
            const typeColor = TYPE_COLORS[typeLabel] || 'bg-gray-100 text-gray-600';

            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${typeColor}`}>
                        {typeLabel}
                      </span>
                      {r.is_featured && <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full"><Star className="w-3 h-3" /> Featured</span>}
                    </div>
                    {locked && <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                  </div>

                  <Link to={`${createPageUrl('LawyerResourceDetail')}?slug=${r.slug}`}>
                    <h3 className="font-bold text-gray-900 mb-2 hover:text-[#3a164d] transition-colors line-clamp-2">{r.title}</h3>
                  </Link>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3">{r.description}</p>

                  {r.category && <p className="text-xs text-[#3a164d] font-medium mb-2">{r.category}</p>}
                  {r.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {r.tags.slice(0, 4).map(t => (
                        <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                  {r.file_size > 0 && <p className="text-xs text-gray-400 mb-3">{formatBytes(r.file_size)}</p>}
                </div>

                <div className="px-5 pb-5">
                  {locked ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
                      <Lock className="w-4 h-4" />
                      <span>Available after approval</span>
                    </div>
                  ) : r.resource_type === 'upload' ? (
                    <a
                      href={r.file_url} target="_blank" rel="noreferrer"
                      onClick={() => trackEvent(r, 'download')}
                      className="flex items-center justify-center gap-2 w-full bg-[#3a164d] hover:bg-[#2a1038] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  ) : (
                    <a
                      href={r.external_url}
                      target={r.external_new_tab ? '_blank' : '_self'}
                      rel="noreferrer"
                      onClick={() => trackEvent(r, 'open_link')}
                      className="flex items-center justify-center gap-2 w-full bg-[#3a164d] hover:bg-[#2a1038] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Link
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}