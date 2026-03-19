import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, MessageSquare, Briefcase, Settings, Loader2, Shield, LogOut, FolderOpen, FileText } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import CircleChat from '@/components/circles/CircleChat';
import CircleCases from '@/components/circles/CircleCases';
import CircleMembers from '@/components/circles/CircleMembers';
import CircleSettings from '@/components/circles/CircleSettings';
import CircleResources from '@/components/circles/CircleResources';
import CircleDocuments from '@/components/circles/CircleDocuments';

export default function GroupDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');

  const urlParams = new URLSearchParams(window.location.search);
  const circleId = urlParams.get('id');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('Home')); return; }
        const userData = await base44.auth.me();
        setUser(userData);
      } catch {
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

  const { data: circles = [], isLoading: circleLoading } = useQuery({
    queryKey: ['legalCircle', circleId],
    queryFn: () => base44.entities.LegalCircle.filter({ id: circleId }),
    enabled: !!circleId,
    retry: 5,
    retryDelay: 1000,
  });
  const circle = circles[0] || null;

  const { data: myMemberships = [], isLoading: membershipLoading, isError: membershipError } = useQuery({
    queryKey: ['myCircleMembership', circleId, user?.id],
    queryFn: () => base44.entities.LegalCircleMember.filter({ circle_id: circleId, user_id: user.id, status: 'active' }),
    enabled: !!circleId && !!user?.id,
    retry: 2,
    retryDelay: 1000,
  });
  const myMembership = myMemberships[0] || null;
  const isAdmin = myMembership?.role === 'admin' || myMembership?.role === 'moderator';

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['circleMembers', circleId],
    queryFn: async () => {
      const circleMembers = await base44.entities.LegalCircleMember.filter({ circle_id: circleId, status: 'active' }, '-joined_at', 100);
      // Fetch lawyer profiles to get profile photos and full names
      const lawyerProfiles = await base44.entities.LawyerProfile.list();
      // Merge profile data with members and update full_name if missing
      const enrichedMembers = await Promise.all(circleMembers.map(async (member) => {
        const profile = lawyerProfiles.find(p => p.user_id === member.user_id);
        const fullName = member.full_name || profile?.full_name || member.user_name || 'Attorney';
        
        // Update the member record if full_name is missing
        if (!member.full_name && fullName) {
          await base44.entities.LegalCircleMember.update(member.id, { full_name: fullName });
        }
        
        return {
          ...member,
          full_name,
          profile_photo_url: profile?.profile_photo_url || null
        };
      }));
      return enrichedMembers;
    },
    enabled: !!circleId && !!myMembership,
    retry: 2,
    retryDelay: 1000,
  });

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this circle?')) return;
    await base44.entities.LegalCircleMember.update(myMembership.id, { status: 'removed' });
    navigate(createPageUrl('Groups'));
  };

  if (loading || circleLoading || membershipLoading || membersLoading) {
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
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Circles
              </TMLButton>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'resources', label: 'Resources', icon: FolderOpen },
    { id: 'members', label: 'Members', icon: Users, count: members.length },
    ...(circle.case_sharing_enabled ? [{ id: 'cases', label: 'Cases', icon: Briefcase }] : []),
    ...(isAdmin ? [{ id: 'settings', label: 'Settings', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <Link to={createPageUrl('Groups')} className="inline-flex items-center text-gray-500 hover:text-[#3a164d] mb-6 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" />Back to Circles
          </Link>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="bg-gradient-to-r from-[#3a164d] to-[#5a2a6d] rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h1 className="text-2xl font-bold text-white">{circle.name}</h1>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#a47864] text-white text-xs font-medium">
                          <Shield className="w-3 h-3" />Admin
                        </span>
                      )}
                    </div>
                    {circle.description && <p className="text-white/70 text-sm">{circle.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-white/60 text-xs">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{members.length} members</span>
                      {circle.case_sharing_enabled && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />Cases enabled</span>}
                    </div>
                  </div>
                </div>
                <button onClick={handleLeave} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-sm transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Leave</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Tab Bar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#3a164d] text-[#3a164d] bg-[#3a164d]/5'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'chat' && (
            <CircleChat circleId={circleId} user={user} isAdmin={isAdmin} circleName={circle.name} />
          )}
          {activeTab === 'documents' && (
            <CircleDocuments circleId={circleId} user={user} isAdmin={isAdmin} />
          )}
          {activeTab === 'members' && (
            <CircleMembers circleId={circleId} members={members} user={user} isAdmin={isAdmin} circleName={circle.name} />
          )}
          {activeTab === 'cases' && circle.case_sharing_enabled && (
            <CircleCases circleId={circleId} circle={circle} user={user} isAdmin={isAdmin} />
          )}
          {activeTab === 'resources' && (
            <CircleResources circleId={circleId} user={user} isAdmin={isAdmin} />
          )}
          {activeTab === 'settings' && isAdmin && (
            <CircleSettings circle={circle} members={members} isAdmin={isAdmin} />
          )}
        </div>
      </main>
    </div>
  );
}