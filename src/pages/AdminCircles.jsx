import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, Briefcase, Shield, Loader2, Eye, AlertTriangle, CheckCircle, X } from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default function AdminCircles() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membersModal, setMembersModal] = useState(null); // { circleName, members }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('AdminLogin')); return; }
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') { navigate(createPageUrl('LawyerDashboard')); return; }
        setUser(userData);
      } catch {
        navigate(createPageUrl('AdminLogin'));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: circles = [], isLoading: circlesLoading } = useQuery({
    queryKey: ['adminAllCircles'],
    queryFn: () => base44.entities.LegalCircle.list('-created_date', 100),
    enabled: !!user,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['adminAllMembers'],
    queryFn: () => base44.entities.LegalCircleMember.list('-created_date', 500),
    enabled: !!user,
  });

  const { data: allCases = [] } = useQuery({
    queryKey: ['adminAllCircleCases'],
    queryFn: () => base44.entities.LegalCircleCase.list('-created_date', 500),
    enabled: !!user,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['adminAllCircleMessages'],
    queryFn: () => base44.entities.CircleMessage.list('-created_date', 200),
    enabled: !!user,
  });

  const handleToggleActive = async (circle) => {
    await base44.entities.LegalCircle.update(circle.id, { is_active: !circle.is_active });
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  const stats = [
    { label: 'Total Circles', value: circles.length, icon: Users, color: 'bg-purple-50 text-purple-700' },
    { label: 'Active Circles', value: circles.filter(c => c.is_active).length, icon: CheckCircle, color: 'bg-green-50 text-green-700' },
    { label: 'Total Cases', value: allCases.length, icon: Briefcase, color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Messages', value: allMessages.length, icon: MessageSquare, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar user={user} />
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Legal Circles Monitor</h1>
            <p className="text-gray-500 mt-1">View and monitor all legal circles on the platform.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Circles Table */}
          {circlesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900">All Circles</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Circle</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cases</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Messages</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {circles.map(circle => {
                      const circleMembers = allMembers.filter(m => m.circle_id === circle.id && m.status === 'active');
                      const circleCases = allCases.filter(c => c.circle_id === circle.id);
                      const circleMessages = allMessages.filter(m => m.circle_id === circle.id && !m.is_deleted);
                      return (
                        <tr key={circle.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3a164d] to-[#a47864] flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{circle.name}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[200px]">{circle.description || 'No description'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => setMembersModal({ circleName: circle.name, members: circleMembers })}
                              className="flex items-center gap-1.5 text-[#3a164d] hover:underline font-medium"
                            >
                              <Users className="w-4 h-4" />
                              <span>{circleMembers.length}</span>
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Briefcase className="w-4 h-4" />
                              <span>{circleCases.length}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MessageSquare className="w-4 h-4" />
                              <span>{circleMessages.length}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-medium capitalize">
                              {circle.group_type?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              circle.is_active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            }`}>
                              {circle.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleActive(circle)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  circle.is_active
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                }`}
                              >
                                {circle.is_active ? (
                                  <><AlertTriangle className="w-3 h-3" />Disable</>
                                ) : (
                                  <><CheckCircle className="w-3 h-3" />Enable</>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {circles.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No circles created yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}