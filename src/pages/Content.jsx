import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser, getProfile } from '@/services/auth';
import { filterContentPosts } from '@/services/content';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter,
  FileText,
  ArrowRight,
  Loader2,
  X,
  Calendar,
  User,
  Pin
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLSelect from '@/components/ui/TMLSelect';

export default function Content() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    tag: '',
    sort: '-published_at'
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) {
          navigate(createPageUrl('Home'));
          return;
        }
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
    queryFn: () => getProfile(user.id).then(p => p ? [p] : []),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles[0] || null;

  // Get published content
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['contentPosts'],
    queryFn: () => filterContentPosts({ is_published: true }, filters.sort),
    enabled: !!user,
  });

  // Get all unique tags
  const allTags = [...new Set(posts.flatMap(p => p.tags || []))];

  // Filter posts
  const filteredPosts = posts.filter(post => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!post.title?.toLowerCase().includes(searchLower) && 
          !post.excerpt?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.category && post.category !== filters.category) return false;
    if (filters.tag && !(post.tags || []).includes(filters.tag)) return false;
    return true;
  });

  // Sort pinned to top
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      tag: '',
      sort: '-published_at'
    });
  };

  const hasActiveFilters = filters.category || filters.tag;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Content & Updates</h1>
            <p className="text-gray-600 mt-1">Stay informed with the latest announcements, legal insights, and platform updates.</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]"
                />
              </div>
              
              <TMLButton 
                variant={showFilters ? 'primary' : 'outline'} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </TMLButton>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-gray-100"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TMLSelect
                    label="Category"
                    placeholder="All Categories"
                    options={[
                      { value: '', label: 'All Categories' },
                      { value: 'Announcement', label: 'Announcement' },
                      { value: 'Education', label: 'Education' },
                      { value: 'Mass Tort Update', label: 'Mass Tort Update' },
                      { value: 'Platform Update', label: 'Platform Update' },
                      { value: 'Legal News', label: 'Legal News' }
                    ]}
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />

                  <TMLSelect
                    label="Tag"
                    placeholder="All Tags"
                    options={[
                      { value: '', label: 'All Tags' },
                      ...allTags.map(t => ({ value: t, label: t }))
                    ]}
                    value={filters.tag}
                    onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                  />

                  <TMLSelect
                    label="Sort By"
                    options={[
                      { value: '-published_at', label: 'Most Recent' },
                      { value: 'title', label: 'A-Z' },
                      { value: '-title', label: 'Z-A' }
                    ]}
                    value={filters.sort}
                    onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                  />
                </div>
                
                {hasActiveFilters && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-[#3a164d] hover:underline flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Clear filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              Showing <span className="font-semibold">{sortedPosts.length}</span> articles
            </p>
          </div>

          {/* Posts List */}
          {postsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
            </div>
          ) : sortedPosts.length === 0 ? (
            <TMLCard variant="cream" className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content Found</h3>
              <p className="text-gray-600">
                {hasActiveFilters 
                  ? 'Try adjusting your filters.'
                  : 'Check back soon for new updates.'}
              </p>
            </TMLCard>
          ) : (
            <div className="space-y-4">
              {sortedPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`${createPageUrl('ContentDetail')}?slug=${post.slug}`}>
                    <TMLCard hover className="transition-all duration-300 hover:shadow-lg">
                      <TMLCardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3 flex-wrap">
                              {post.is_pinned && (
                                <TMLBadge variant="trending" size="sm">
                                  <Pin className="w-3 h-3 mr-1" /> Pinned
                                </TMLBadge>
                              )}
                              <TMLBadge variant="primary" size="sm">
                                {post.category}
                              </TMLBadge>
                            </div>
                            
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h3>
                            
                            <p className="text-gray-600 mb-4 line-clamp-2">
                              {post.excerpt}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              {post.author_name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {post.author_name}
                                </span>
                              )}
                              {post.published_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(post.published_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {(post.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {post.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <TMLButton variant="primary" size="sm">
                            Read More
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </TMLButton>
                        </div>
                      </TMLCardContent>
                    </TMLCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}