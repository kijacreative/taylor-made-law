import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Users,
  MessageSquare,
  Briefcase,
  Settings,
  Loader2,
  Shield,
  UserPlus
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

export default function GroupDetail() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  
  const urlParams = new URLSearchParams(window.location.search);
  const circleId = urlParams.get('id');

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

  // Get circle
  const { data: circles = [], isLoading: circleLoading } = useQuery({
    queryKey: ['legalCircle', circleId],
    queryFn: () => base44.entities.LegalCircle.filter({ id: circleId }),
    enabled: !!circleId,
  });

  const circle = circles[0] || null;

  // Get my membership
  const { data: myMemberships = [] } = useQuery({
    queryKey: ['myCircleMembership', circleId, user?.id],
    queryFn: () => base44.entities.LegalCircleMember.filter({ 
      circle_id: circleId,
      user_id: user.id,
      status: 'active'
    }),
    enabled: !!circleId && !!user?.id,
  });

  const myMembership = myMemberships[0] || null;
  const isAdmin = myMembership?.role === 'admin' || myMembership?.role === 'moderator';

  // Get all members
  const { data: members = [] } = useQuery({
    queryKey: ['circleMembers', circleId],
    queryFn: () => base44.entities.LegalCircleMember.filter({ 
      circle_id: circleId,
      status: 'active'
    }),
    enabled: !!circleId && !!myMembership,
  });

  // Get posts
  const { data: posts = [] } = useQuery({
    queryKey: ['circlePosts', circleId],
    queryFn: () => base44.entities.LegalCirclePost.filter({ 
      circle_id: circleId,
      is_removed: false
    }, '-created_date'),
    enabled: !!circleId && !!myMembership,
  });

  // Get cases
  const { data: cases = [] } = useQuery({
    queryKey: ['circleCases', circleId],
    queryFn: () => base44.entities.LegalCircleCase.filter({ 
      circle_id: circleId,
      status: 'available'
    }),
    enabled: !!circleId && !!myMembership && circle?.case_sharing_enabled,
  });

  if (loading || circleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  if (!circle || !myMembership) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppSidebar user={user} lawyerProfile={lawyerProfile} />
        <main className="ml-64 p-8">
          <div className="max-w-4xl mx-auto text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Circle Not Found</h2>
            <p className="text-gray-600 mb-6">This circle doesn't exist or you don't have access.</p>
            <Link to={createPageUrl('Groups')}>
              <TMLButton variant="primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Circles
              </TMLButton>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const tabs = [
    { id: 'feed', label: 'Feed', icon: MessageSquare, count: posts.length },
    { id: 'members', label: 'Members', icon: Users, count: members.length },
    ...(circle.case_sharing_enabled ? [{ id: 'cases', label: 'Cases', icon: Briefcase, count: cases.length }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <Link to={createPageUrl('Groups')} className="inline-flex items-center text-gray-600 hover:text-[#3a164d] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Circles
          </Link>

          {/* Circle Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TMLCard variant="elevated" className="mb-6">
              <TMLCardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#3a164d] to-[#993333] flex items-center justify-center">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-gray-900">{circle.name}</h1>
                        {isAdmin && (
                          <TMLBadge variant="primary">
                            <Shield className="w-3 h-3 mr-1" />
                            {myMembership.role}
                          </TMLBadge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{circle.description}</p>
                      
                      {circle.tags && circle.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {circle.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {isAdmin && (
                      <>
                        <TMLButton variant="outline" size="sm">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invite
                        </TMLButton>
                        <TMLButton variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </TMLButton>
                      </>
                    )}
                  </div>
                </div>
              </TMLCardContent>
            </TMLCard>
          </motion.div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex border-b border-gray-100">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#3a164d] text-[#3a164d]'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <TMLCard variant="cream" className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Posts Yet</h3>
                  <p className="text-gray-600">Be the first to start a conversation.</p>
                </TMLCard>
              ) : (
                posts.map(post => (
                  <TMLCard key={post.id}>
                    <TMLCardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#3a164d] text-white flex items-center justify-center font-semibold">
                          {post.author_name?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">{post.author_name}</span>
                            <span className="text-sm text-gray-500">
                              {new Date(post.created_date).toLocaleDateString()}
                            </span>
                            {post.is_pinned && (
                              <TMLBadge variant="primary" size="sm">Pinned</TMLBadge>
                            )}
                          </div>
                          {post.title && <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>}
                          <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>
                        </div>
                      </div>
                    </TMLCardContent>
                  </TMLCard>
                ))
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <TMLCard>
              <TMLCardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-[#3a164d] text-white flex items-center justify-center font-semibold">
                        {member.user_name?.charAt(0) || 'A'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{member.user_name}</p>
                        <p className="text-sm text-gray-500">{member.user_email}</p>
                      </div>
                      <TMLBadge variant={member.role === 'admin' ? 'primary' : 'default'} size="sm">
                        {member.role}
                      </TMLBadge>
                    </div>
                  ))}
                </div>
              </TMLCardContent>
            </TMLCard>
          )}

          {activeTab === 'cases' && (
            <div className="space-y-4">
              {cases.length === 0 ? (
                <TMLCard variant="cream" className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Available Cases</h3>
                  <p className="text-gray-600">Check back later for new case opportunities.</p>
                </TMLCard>
              ) : (
                cases.map(caseItem => (
                  <TMLCard key={caseItem.id} hover>
                    <TMLCardContent className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                      <p className="text-gray-600 mb-4">{caseItem.summary}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{caseItem.practice_area}</span>
                        <span>•</span>
                        <span>{caseItem.state}</span>
                        {caseItem.estimated_value && (
                          <>
                            <span>•</span>
                            <span>${caseItem.estimated_value.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </TMLCardContent>
                  </TMLCard>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}