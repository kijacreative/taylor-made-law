import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Loader2,
  Plus,
  Gavel,
  Users,
  BookOpen,
  Zap,
  Scale,
  Building2,
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import { PRACTICE_AREAS } from '@/components/design/DesignTokens';
import SubmitCaseModal from '@/components/cases/SubmitCaseModal';

export default function CaseExchange() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [lawyerProfile, setLawyerProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('LawyerLogin')); return; }
        const userData = await base44.auth.me();
        if (userData.role === 'admin') { navigate(createPageUrl('AdminDashboard')); return; }
        setUser(userData);
        const profiles = await base44.entities.LawyerProfile.filter({ user_id: userData.id });
        setLawyerProfile(profiles[0] || null);
      } catch { navigate(createPageUrl('Home')); }
      finally { setAuthLoading(false); }
    };
    checkAuth();
  }, []);

  const isApproved = user?.user_status === 'approved' || (!user?.user_status && lawyerProfile?.status === 'approved');

  // Server-side enforced case fetch
  const { data: caseData, isLoading: casesLoading } = useQuery({
    queryKey: ['casesForLawyer', user?.id, selectedCategory],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCasesForLawyer', { practice_area: selectedCategory });
      return res.data;
    },
    enabled: !!user && !!selectedCategory,
  });

  const cases = caseData?.cases || [];

  // Define practice area categories with colors and icons
  const categories = [
    { name: 'Criminal', color: '#a8344e', icon: '⚖️', desc: 'Criminal Defense' },
    { name: 'Family', color: '#1e40af', icon: '👨‍👩‍👧', desc: 'Family Law' },
    { name: 'Estate', color: '#6b21a8', icon: '📋', desc: 'Estate Planning' },
    { name: 'Personal Injury', color: '#c2410c', icon: '🏥', desc: 'Personal Injury' },
    { name: 'Mass Torts', color: '#15803d', icon: '⚖️', desc: 'Mass Tort Litigation' },
    { name: 'Class Actions', color: '#0f766e', icon: '🏛️', desc: 'Class Actions' },
  ];

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  if (!selectedCategory) {
    // Category selection view
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <AppSidebar user={user} lawyerProfile={lawyerProfile} />

        <main className="ml-64 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-12 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Case Exchange</h1>
                <p className="text-gray-600 mt-2">Browse cases by practice area</p>
              </div>
              {isApproved && (
                <TMLButton variant="primary" onClick={() => setShowSubmitModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit a Case
                </TMLButton>
              )}
            </div>

            {showSubmitModal && (
              <SubmitCaseModal user={user} onClose={() => setShowSubmitModal(false)} />
            )}

            {/* Category Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
              {categories.map((cat, idx) => (
                <motion.button
                  key={cat.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedCategory(cat.name)}
                  className="group cursor-pointer"
                >
                  <div className="flex flex-col items-center">
                    {/* Circular Icon Container */}
                    <div
                      className="w-40 h-40 rounded-full flex items-center justify-center mb-4 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105"
                      style={{ backgroundColor: cat.color }}
                    >
                      <span className="text-6xl">{cat.icon}</span>
                    </div>
                    {/* Text */}
                    <h3 className="text-xl font-bold text-gray-900 text-center">{cat.name}</h3>
                    <p className="text-sm text-gray-600 text-center mt-1">{cat.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Case list view for selected category
  const selectedCategoryObj = categories.find(c => c.name === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />

      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors"
              >
                ← Back to Categories
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedCategory}</h1>
              </div>
            </div>
            {isApproved && (
              <TMLButton variant="primary" onClick={() => setShowSubmitModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Submit a Case
              </TMLButton>
            )}
          </div>

          {showSubmitModal && (
            <SubmitCaseModal user={user} onClose={() => setShowSubmitModal(false)} />
          )}

          {casesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
            </div>
          ) : (
            <>
              {cases.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cases Available</h3>
                  <p className="text-gray-600">Check back soon for new {selectedCategory} cases.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cases.map((caseItem, index) => (
                    <motion.div
                      key={caseItem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <a href={`${createPageUrl('CaseDetail')}?id=${caseItem.id}`}>
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                              <p className="text-gray-600 mb-4 line-clamp-2">{caseItem.description}</p>
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Scale className="w-4 h-4" />{caseItem.practice_area}</span>
                                {caseItem.state && <span className="flex items-center gap-1">📍 {caseItem.state}</span>}
                              </div>
                            </div>
                            {caseItem.estimated_value && isApproved && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Est. Value</p>
                                <p className="text-2xl font-bold text-emerald-600">${caseItem.estimated_value.toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </a>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}