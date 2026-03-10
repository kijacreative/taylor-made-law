import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Users,
  Plus,
  Lock,
  Globe,
  ArrowRight,
  Loader2,
  Shield,
  Sparkles,
  Search
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

export default function Groups() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Get user's group memberships
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['myGroupMemberships', user?.id],
    queryFn: () => base44.entities.LegalCircleMember.filter({ 
      user_id: user.id,
      status: 'active'
    }),
    enabled: !!user?.id,
  });

  // Get the actual groups
  const { data: allCircles = [] } = useQuery({
    queryKey: ['legalCircles'],
    queryFn: () => base44.entities.LegalCircle.list(),
    enabled: !!user,
  });

  const myCircles = allCircles.filter(circle => 
    memberships.some(m => m.circle_id === circle.id)
  );

  // Get pending invitations
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pendingInvites', user?.email],
    queryFn: () => base44.entities.LegalCircleInvitation.filter({
      invitee_email: user.email,
      status: 'pending'
    }),
    enabled: !!user?.email,
  });

  if (loading || membershipsLoading) {
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
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal Circles</h1>
              <p className="text-gray-600">
                Private communities for collaboration, case sharing, and professional networking.
              </p>
            </div>
            <Link to={createPageUrl('CreateGroup')}>
              <TMLButton variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Circle
              </TMLButton>
            </Link>
          </div>

          {/* Pending Invitations */}
          {pendingInvites.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <TMLCard variant="gradient" className="border-l-4 border-l-[#a47864]">
                <TMLCardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-white mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">
                        You have {pendingInvites.length} pending invitation{pendingInvites.length > 1 ? 's' : ''}
                      </h3>
                      <div className="space-y-2">
                        {pendingInvites.slice(0, 3).map(invite => {
                          const circle = allCircles.find(c => c.id === invite.circle_id);
                          return (
                            <div key={invite.id} className="bg-white/10 rounded-lg p-3 text-white">
                              <p className="font-medium">{circle?.name || 'Legal Circle'}</p>
                              <p className="text-sm text-white/80">From {invite.inviter_name}</p>
                            </div>
                          );
                        })}
                      </div>
                      <Link to={createPageUrl('GroupInvitations')} className="mt-3 inline-block">
                        <TMLButton variant="accent" size="sm">
                          View All Invitations
                        </TMLButton>
                      </Link>
                    </div>
                  </div>
                </TMLCardContent>
              </TMLCard>
            </motion.div>
          )}

          {/* My Circles */}
          {myCircles.length === 0 ? (
            <TMLCard variant="cream" className="text-center py-16">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Circles Yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first Legal Circle or accept an invitation to get started.
              </p>
              <Link to={createPageUrl('CreateGroup')}>
                <TMLButton variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Circle
                </TMLButton>
              </Link>
            </TMLCard>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCircles.map((circle, index) => {
                const myMembership = memberships.find(m => m.circle_id === circle.id);
                const isAdmin = myMembership?.role === 'admin';
                
                return (
                  <motion.div
                    key={circle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`${createPageUrl('GroupDetail')}?id=${circle.id}`}>
                      <TMLCard hover className="h-full">
                        <TMLCardHeader>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3a164d] to-[#993333] flex items-center justify-center">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex gap-2">
                              {circle.visibility === 'hidden' ? (
                                <Lock className="w-4 h-4 text-gray-400" />
                              ) : (
                                <Globe className="w-4 h-4 text-gray-400" />
                              )}
                              {isAdmin && (
                                <Shield className="w-4 h-4 text-[#a47864]" />
                              )}
                            </div>
                          </div>
                          <TMLCardTitle>{circle.name}</TMLCardTitle>
                        </TMLCardHeader>
                        <TMLCardContent>
                          <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                            {circle.description || 'Private legal community'}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {circle.member_count || 0}
                              </span>
                            </div>
                            
                            <TMLBadge variant={isAdmin ? 'primary' : 'default'} size="sm">
                              {myMembership?.role || 'member'}
                            </TMLBadge>
                          </div>

                          {circle.tags && circle.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {circle.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </TMLCardContent>
                      </TMLCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}