import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FolderOpen, 
  Scale, 
  MapPin, 
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Loader2,
  ArrowRight,
  AlertCircle,
  Edit,
  X
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import { CASE_STATUSES } from '@/components/design/DesignTokens';

export default function MyCases() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [editingCase, setEditingCase] = useState(null);
  const [saving, setSaving] = useState(false);

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

  // Get my cases
  const { data: myCases = [], isLoading: casesLoading, refetch } = useQuery({
    queryKey: ['myCases', user?.email],
    queryFn: () => base44.entities.Case.filter({ accepted_by_email: user.email }, '-accepted_at'),
    enabled: !!user?.email,
  });

  const activeCases = myCases.filter(c => ['accepted', 'in_progress'].includes(c.status));
  const closedCases = myCases.filter(c => ['closed', 'withdrawn'].includes(c.status));

  const displayCases = activeTab === 'active' ? activeCases : closedCases;

  const handleEditCase = (caseItem) => {
    setEditingCase({
      id: caseItem.id,
      description: caseItem.description || '',
      estimated_value: caseItem.estimated_value || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCase) return;
    
    setSaving(true);
    try {
      await base44.entities.Case.update(editingCase.id, {
        description: editingCase.description,
        estimated_value: editingCase.estimated_value ? parseFloat(editingCase.estimated_value) : null
      });
      
      setEditingCase(null);
      refetch();
    } catch (err) {
      console.error('Error updating case:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Cases</h1>
              <p className="text-gray-600 mt-1">Manage your accepted case referrals.</p>
            </div>
            <Link to={createPageUrl('CaseExchange')}>
              <TMLButton variant="primary">
                Browse More Cases
                <ArrowRight className="w-4 h-4 ml-2" />
              </TMLButton>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-[#7e277e] text-white shadow-lg shadow-[#7e277e]/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active Cases ({activeCases.length})
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'closed'
                  ? 'bg-[#7e277e] text-white shadow-lg shadow-[#7e277e]/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Closed Cases ({closedCases.length})
            </button>
          </div>

          {/* Cases List */}
          {casesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
            </div>
          ) : displayCases.length === 0 ? (
            <TMLCard variant="cream" className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No {activeTab === 'active' ? 'Active' : 'Closed'} Cases
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'active'
                  ? 'Browse the Case Exchange to find and accept new cases.'
                  : 'Your closed cases will appear here.'}
              </p>
              {activeTab === 'active' && (
                <Link to={createPageUrl('CaseExchange')}>
                  <TMLButton variant="primary">
                    Browse Cases
                  </TMLButton>
                </Link>
              )}
            </TMLCard>
          ) : (
            <div className="space-y-4">
              {displayCases.map((caseItem, index) => (
                <motion.div
                  key={caseItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TMLCard hover className="transition-all duration-300 hover:shadow-lg">
                    <TMLCardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <TMLBadge 
                              variant={caseItem.status === 'in_progress' ? 'warning' : caseItem.status === 'accepted' ? 'success' : 'default'}
                            >
                              {CASE_STATUSES[caseItem.status]?.label || caseItem.status}
                            </TMLBadge>
                          </div>
                          
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                          
                          <div className="flex flex-wrap gap-4 mb-4">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Scale className="w-4 h-4" />
                              <span>{caseItem.practice_area}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{caseItem.state}</span>
                            </div>
                            {caseItem.accepted_at && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Accepted {new Date(caseItem.accepted_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          {/* Client Info */}
                          {(caseItem.client_first_name || caseItem.client_email || caseItem.client_phone) && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm font-medium text-gray-900 mb-2">Client Contact</p>
                              <div className="grid md:grid-cols-3 gap-3">
                                {caseItem.client_first_name && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User className="w-4 h-4" />
                                    <span>{caseItem.client_first_name} {caseItem.client_last_name}</span>
                                  </div>
                                )}
                                {caseItem.client_email && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="w-4 h-4" />
                                    <a href={`mailto:${caseItem.client_email}`} className="hover:text-[#7e277e]">
                                      {caseItem.client_email}
                                    </a>
                                  </div>
                                )}
                                {caseItem.client_phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-4 h-4" />
                                    <a href={`tel:${caseItem.client_phone}`} className="hover:text-[#7e277e]">
                                      {caseItem.client_phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-3">
                          {caseItem.estimated_value && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Est. Value</p>
                              <p className="text-2xl font-bold text-emerald-600">
                                ${caseItem.estimated_value.toLocaleString()}
                              </p>
                            </div>
                          )}
                          <TMLButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCase(caseItem)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Details
                          </TMLButton>
                        </div>
                      </div>
                    </TMLCardContent>
                  </TMLCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Case Modal */}
      {editingCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Case Details</h3>
              <button onClick={() => setEditingCase(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <TMLTextarea
                label="Case Notes / Description"
                placeholder="Add notes or update case description..."
                value={editingCase.description}
                onChange={(e) => setEditingCase({ ...editingCase, description: e.target.value })}
                rows={6}
              />
              
              <TMLInput
                label="Estimated Value ($)"
                type="number"
                placeholder="Enter estimated case value"
                value={editingCase.estimated_value}
                onChange={(e) => setEditingCase({ ...editingCase, estimated_value: e.target.value })}
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <TMLButton variant="outline" onClick={() => setEditingCase(null)} className="flex-1">
                Cancel
              </TMLButton>
              <TMLButton 
                variant="primary" 
                onClick={handleSaveEdit} 
                className="flex-1"
                loading={saving}
              >
                Save Changes
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}