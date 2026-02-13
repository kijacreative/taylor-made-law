import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Scale,
  Building2,
  Loader2,
  X,
  DollarSign,
  Gift,
  Shield,
  Eye,
  Edit
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLSelect from '@/components/ui/TMLSelect';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import { LAWYER_STATUSES, PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';

export default function AdminLawyers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [viewingLawyer, setViewingLawyer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [freeTrialMonths, setFreeTrialMonths] = useState('6');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    firm_name: '',
    states_served: [],
    practice_areas: [],
    admin_note: '',
    send_email: true
  });
  const [inviting, setInviting] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    state: '',
    practice_area: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          navigate(createPageUrl('Home'));
          return;
        }
        const userData = await base44.auth.me();
        
        if (!['admin', 'senior_associate', 'junior_associate'].includes(userData.user_type) && userData.role !== 'admin') {
          navigate(createPageUrl('LawyerDashboard'));
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

  // Get lawyers
  const { data: lawyers = [], isLoading: lawyersLoading, refetch } = useQuery({
    queryKey: ['allLawyers'],
    queryFn: () => base44.entities.LawyerProfile.list('-created_date'),
    enabled: !!user,
  });

  // Filter lawyers
  const filteredLawyers = lawyers.filter(lawyer => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!lawyer.firm_name?.toLowerCase().includes(searchLower) && 
          !lawyer.created_by?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filters.status && lawyer.status !== filters.status) return false;
    if (filters.state && !(lawyer.states_licensed || []).includes(filters.state)) return false;
    if (filters.practice_area && !(lawyer.practice_areas || []).includes(filters.practice_area)) return false;
    return true;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      state: '',
      practice_area: ''
    });
  };

  const hasActiveFilters = filters.status || filters.state || filters.practice_area;

  // Status counts
  const statusCounts = lawyers.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const quickFilters = [
    { value: '', label: 'All', count: lawyers.length },
    { value: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
    { value: 'approved', label: 'Approved', count: statusCounts.approved || 0 },
    { value: 'restricted', label: 'Restricted', count: statusCounts.restricted || 0 },
    { value: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled || 0 },
  ];

  const handleApprove = async (lawyer) => {
    setSaving(true);
    setSuccess(null);
    
    try {
      const updateData = {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.email,
        subscription_status: parseInt(freeTrialMonths) > 0 ? 'trial' : 'active',
        free_trial_months: parseInt(freeTrialMonths) || 0
      };
      
      if (parseInt(freeTrialMonths) > 0) {
        const trialEnd = new Date();
        trialEnd.setMonth(trialEnd.getMonth() + parseInt(freeTrialMonths));
        updateData.trial_ends_at = trialEnd.toISOString();
      }
      
      await base44.entities.LawyerProfile.update(lawyer.id, updateData);
      
      // Create audit log
      await base44.entities.AuditLog.create({
        entity_type: 'LawyerProfile',
        entity_id: lawyer.id,
        action: 'approve',
        actor_email: user.email,
        actor_role: user.user_type || user.role,
        notes: `Approved with ${freeTrialMonths} months free trial`
      });
      
      // Send approval email with login instructions
      try {
        const loginUrl = `${window.location.origin}${createPageUrl('Login')}`;
        await base44.integrations.Core.SendEmail({
          to: lawyer.created_by,
          subject: "You're Approved — Access Your TML Account",
          body: `
Congratulations ${lawyer.firm_name}!

Your application to join the Taylor Made Law attorney network has been approved!

🎉 You now have full access to:
• Browse and accept case referrals
• Access the Case Exchange marketplace
• Manage your profile and preferences
• Connect with our attorney community

${parseInt(freeTrialMonths) > 0 ? `🎁 SPECIAL WELCOME OFFER\nAs a welcome gift, you have ${freeTrialMonths} months of FREE membership! No payment required during your trial period.` : ''}

📲 LOG IN TO YOUR ACCOUNT
Click here to access your attorney dashboard:
${loginUrl}

Use the email address: ${lawyer.created_by}

If you haven't set your password yet, use the "Forgot Password" link to create one.

💼 NEXT STEPS:
1. Log in to your account
2. Complete your profile
3. Start browsing available cases
4. Accept your first referral

Need help getting started? Reply to this email or contact our support team at support@taylormadelaw.com

We're excited to have you in our network!

Best regards,
The Taylor Made Law Team

---
Questions? Contact us at support@taylormadelaw.com
          `.trim()
        });
      } catch (emailErr) {
        console.log('Email send attempted');
      }
      
      setSuccess(`${lawyer.firm_name} approved successfully!`);
      setSelectedLawyer(null);
      refetch();
      queryClient.invalidateQueries(['allLawyers']);
    } catch (err) {
      console.error('Error approving lawyer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (lawyer, newStatus) => {
    setSaving(true);
    
    try {
      await base44.entities.LawyerProfile.update(lawyer.id, {
        status: newStatus
      });
      
      await base44.entities.AuditLog.create({
        entity_type: 'LawyerProfile',
        entity_id: lawyer.id,
        action: `status_change_${newStatus}`,
        actor_email: user.email,
        actor_role: user.user_type || user.role,
        notes: `Status changed to ${newStatus}`
      });
      
      setSuccess(`Status updated to ${LAWYER_STATUSES[newStatus]?.label || newStatus}`);
      setSelectedLawyer(null);
      refetch();
    } catch (err) {
      console.error('Error changing status:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleViewLawyer = (lawyer) => {
    setViewingLawyer({
      ...lawyer,
      bio: lawyer.bio || '',
      phone: lawyer.phone || '',
      bar_number: lawyer.bar_number || '',
      years_experience: lawyer.years_experience || ''
    });
  };

  const handleSaveLawyerChanges = async () => {
    if (!viewingLawyer) return;
    
    setSaving(true);
    try {
      await base44.entities.LawyerProfile.update(viewingLawyer.id, {
        firm_name: viewingLawyer.firm_name,
        phone: viewingLawyer.phone,
        bar_number: viewingLawyer.bar_number,
        bio: viewingLawyer.bio,
        years_experience: viewingLawyer.years_experience ? parseInt(viewingLawyer.years_experience) : null,
        states_licensed: viewingLawyer.states_licensed,
        practice_areas: viewingLawyer.practice_areas
      });
      
      await base44.entities.AuditLog.create({
        entity_type: 'LawyerProfile',
        entity_id: viewingLawyer.id,
        action: 'update_profile',
        actor_email: user.email,
        actor_role: user.user_type || user.role,
        notes: 'Profile information updated by admin'
      });
      
      setSuccess('Lawyer profile updated successfully!');
      setViewingLawyer(null);
      refetch();
    } catch (err) {
      console.error('Error updating lawyer:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar user={user} />
      
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attorney Management</h1>
              <p className="text-gray-600 mt-1">Manage attorney applications and network members.</p>
            </div>
            <TMLButton variant="primary" onClick={() => setShowInviteModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Invite Attorney
            </TMLButton>
          </div>

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-xl"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Quick Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {quickFilters.map((qf) => (
              <button
                key={qf.value}
                onClick={() => setFilters({ ...filters, status: qf.value })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filters.status === qf.value
                    ? 'bg-[#7e277e] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {qf.label}
                <span className={`ml-2 ${filters.status === qf.value ? 'text-white/80' : 'text-gray-400'}`}>
                  ({qf.count})
                </span>
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by firm name or email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7e277e]/20 focus:border-[#7e277e]"
                />
              </div>
              
              <TMLButton 
                variant={showFilters ? 'primary' : 'outline'} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                More Filters
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
                    label="State Licensed"
                    placeholder="All States"
                    options={[{ value: '', label: 'All States' }, ...US_STATES.map(s => ({ value: s, label: s }))]}
                    value={filters.state}
                    onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  />
                  
                  <TMLSelect
                    label="Practice Area"
                    placeholder="All Areas"
                    options={[{ value: '', label: 'All Areas' }, ...PRACTICE_AREAS.map(p => ({ value: p, label: p }))]}
                    value={filters.practice_area}
                    onChange={(e) => setFilters({ ...filters, practice_area: e.target.value })}
                  />
                </div>
                
                {hasActiveFilters && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-[#7e277e] hover:underline flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Clear filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Results */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              Showing <span className="font-semibold">{filteredLawyers.length}</span> attorneys
            </p>
          </div>

          {/* Lawyers List */}
          {lawyersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
            </div>
          ) : filteredLawyers.length === 0 ? (
            <TMLCard variant="cream" className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attorneys Found</h3>
              <p className="text-gray-600">
                {hasActiveFilters || filters.search
                  ? 'Try adjusting your filters.'
                  : 'Attorney applications will appear here.'}
              </p>
            </TMLCard>
          ) : (
            <div className="grid gap-4">
              {filteredLawyers.map((lawyer, index) => (
                <motion.div
                  key={lawyer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <TMLCard hover className="transition-all duration-200 hover:shadow-md">
                    <TMLCardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7e277e] to-[#993333] flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {lawyer.firm_name?.charAt(0) || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-gray-900">{lawyer.firm_name}</h3>
                              <TMLBadge 
                                variant={
                                  lawyer.status === 'approved' ? 'success' :
                                  lawyer.status === 'pending' ? 'warning' :
                                  lawyer.status === 'restricted' ? 'danger' :
                                  'default'
                                }
                                size="sm"
                              >
                                {LAWYER_STATUSES[lawyer.status]?.label || lawyer.status}
                              </TMLBadge>
                              {lawyer.referral_agreement_accepted && (
                                <TMLBadge variant="primary" size="sm">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Agreement Signed
                                </TMLBadge>
                              )}
                              {lawyer.free_trial_months > 0 && (
                                <TMLBadge variant="accent" size="sm">
                                  <Gift className="w-3 h-3 mr-1" />
                                  {lawyer.free_trial_months}mo Trial
                                </TMLBadge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {lawyer.created_by}
                              </span>
                              {lawyer.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {lawyer.phone}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-3">
                              {(lawyer.states_licensed || []).slice(0, 3).map(state => (
                                <TMLBadge key={state} variant="default" size="sm">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {state}
                                </TMLBadge>
                              ))}
                              {(lawyer.states_licensed || []).length > 3 && (
                                <TMLBadge variant="default" size="sm">
                                  +{lawyer.states_licensed.length - 3} more
                                </TMLBadge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(lawyer.practice_areas || []).slice(0, 3).map(area => (
                                <span key={area} className="text-xs text-gray-500">{area}</span>
                              )).reduce((prev, curr, i) => [prev, i > 0 ? ' • ' : '', curr], [])}
                              {(lawyer.practice_areas || []).length > 3 && (
                                <span className="text-xs text-gray-400">+{lawyer.practice_areas.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <TMLButton 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleViewLawyer(lawyer)}
                          >
                            <Eye className="w-4 h-4" />
                          </TMLButton>
                          {lawyer.status === 'pending' && (
                            <TMLButton 
                              variant="success" 
                              size="sm"
                              onClick={() => setSelectedLawyer(lawyer)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </TMLButton>
                          )}
                          {lawyer.status === 'approved' && (
                            <TMLButton 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusChange(lawyer, 'restricted')}
                              loading={saving}
                            >
                              Restrict
                            </TMLButton>
                          )}
                          {lawyer.status === 'restricted' && (
                            <TMLButton 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusChange(lawyer, 'approved')}
                              loading={saving}
                            >
                              Reinstate
                            </TMLButton>
                          )}
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

      {/* Approve Modal */}
      {selectedLawyer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Approve Attorney</h3>
            <p className="text-gray-600 mb-6">
              Approve <strong>{selectedLawyer.firm_name}</strong> to join the network.
            </p>
            
            <div className="mb-6">
              <TMLSelect
                label="Free Trial Period"
                options={[
                  { value: '0', label: 'No free trial' },
                  { value: '1', label: '1 month free' },
                  { value: '3', label: '3 months free' },
                  { value: '6', label: '6 months free (default)' },
                  { value: '12', label: '12 months free' }
                ]}
                value={freeTrialMonths}
                onChange={(e) => setFreeTrialMonths(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-2">
                <Gift className="w-4 h-4 inline mr-1" />
                Attorney will not be charged during the trial period.
              </p>
            </div>
            
            <div className="flex gap-3">
              <TMLButton variant="outline" onClick={() => setSelectedLawyer(null)} className="flex-1">
                Cancel
              </TMLButton>
              <TMLButton 
                variant="success" 
                onClick={() => handleApprove(selectedLawyer)} 
                className="flex-1"
                loading={saving}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* Invite Attorney Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Invite Attorney</h3>
                <p className="text-sm text-gray-500 mt-1">Send invitation to join the TML network</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <TMLInput
                label="Email Address"
                type="email"
                required
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="attorney@lawfirm.com"
              />

              <TMLInput
                label="Full Name (Optional)"
                value={inviteData.full_name}
                onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                placeholder="John Doe"
              />

              <TMLInput
                label="Firm Name (Optional)"
                value={inviteData.firm_name}
                onChange={(e) => setInviteData({ ...inviteData, firm_name: e.target.value })}
                placeholder="Law Firm & Associates"
              />

              <TMLInput
                label="States Served (Optional)"
                value={inviteData.states_served.join(', ')}
                onChange={(e) => setInviteData({ 
                  ...inviteData, 
                  states_served: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                })}
                placeholder="California, Texas, New York"
                helperText="Comma-separated list"
              />

              <TMLInput
                label="Practice Areas (Optional)"
                value={inviteData.practice_areas.join(', ')}
                onChange={(e) => setInviteData({ 
                  ...inviteData, 
                  practice_areas: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                })}
                placeholder="Personal Injury, Medical Malpractice"
                helperText="Comma-separated list"
              />

              <TMLTextarea
                label="Admin Note (Optional)"
                value={inviteData.admin_note}
                onChange={(e) => setInviteData({ ...inviteData, admin_note: e.target.value })}
                placeholder="Internal notes about this invitation..."
                rows={3}
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteData.send_email}
                  onChange={(e) => setInviteData({ ...inviteData, send_email: e.target.checked })}
                  className="w-4 h-4 text-[#7e277e] rounded focus:ring-[#7e277e]"
                />
                <span className="text-sm text-gray-700">Send invitation email now</span>
              </label>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex gap-3">
              <TMLButton variant="outline" onClick={() => setShowInviteModal(false)} className="flex-1">
                Cancel
              </TMLButton>
              <TMLButton 
                variant="primary" 
                onClick={async () => {
                  if (!inviteData.email) {
                    alert('Email is required');
                    return;
                  }
                  setInviting(true);
                  try {
                    await base44.functions.invoke('inviteAttorney', inviteData);
                    setSuccess('Invitation sent successfully!');
                    setShowInviteModal(false);
                    setInviteData({
                      email: '',
                      full_name: '',
                      firm_name: '',
                      states_served: [],
                      practice_areas: [],
                      admin_note: '',
                      send_email: true
                    });
                  } catch (err) {
                    alert('Failed to send invitation: ' + (err.response?.data?.error || err.message));
                  } finally {
                    setInviting(false);
                  }
                }}
                className="flex-1"
                loading={inviting}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* View/Edit Lawyer Modal */}
      {viewingLawyer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{viewingLawyer.firm_name}</h3>
                <p className="text-sm text-gray-500 mt-1">{viewingLawyer.created_by}</p>
              </div>
              <button onClick={() => setViewingLawyer(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status & Badges */}
              <div className="flex flex-wrap gap-2">
                <TMLBadge 
                  variant={
                    viewingLawyer.status === 'approved' ? 'success' :
                    viewingLawyer.status === 'pending' ? 'warning' :
                    viewingLawyer.status === 'restricted' ? 'danger' :
                    'default'
                  }
                >
                  {LAWYER_STATUSES[viewingLawyer.status]?.label || viewingLawyer.status}
                </TMLBadge>
                {viewingLawyer.referral_agreement_accepted && (
                  <TMLBadge variant="primary">
                    <Shield className="w-3 h-3 mr-1" />
                    Agreement Signed
                  </TMLBadge>
                )}
                {viewingLawyer.free_trial_months > 0 && (
                  <TMLBadge variant="accent">
                    <Gift className="w-3 h-3 mr-1" />
                    {viewingLawyer.free_trial_months}mo Trial
                  </TMLBadge>
                )}
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <TMLInput
                    label="Firm Name"
                    value={viewingLawyer.firm_name}
                    onChange={(e) => setViewingLawyer({ ...viewingLawyer, firm_name: e.target.value })}
                  />
                  <TMLInput
                    label="Phone"
                    value={viewingLawyer.phone}
                    onChange={(e) => setViewingLawyer({ ...viewingLawyer, phone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TMLInput
                    label="Bar Number"
                    value={viewingLawyer.bar_number}
                    onChange={(e) => setViewingLawyer({ ...viewingLawyer, bar_number: e.target.value })}
                  />
                  <TMLInput
                    label="Years of Experience"
                    type="number"
                    value={viewingLawyer.years_experience}
                    onChange={(e) => setViewingLawyer({ ...viewingLawyer, years_experience: e.target.value })}
                  />
                </div>

                <TMLTextarea
                  label="Bio"
                  value={viewingLawyer.bio}
                  onChange={(e) => setViewingLawyer({ ...viewingLawyer, bio: e.target.value })}
                  rows={4}
                />

                {/* States Licensed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    States Licensed
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                    {(viewingLawyer.states_licensed || []).map(state => (
                      <TMLBadge key={state} variant="default">
                        <MapPin className="w-3 h-3 mr-1" />
                        {state}
                      </TMLBadge>
                    ))}
                  </div>
                </div>

                {/* Practice Areas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practice Areas
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                    {(viewingLawyer.practice_areas || []).map(area => (
                      <TMLBadge key={area} variant="default">
                        <Scale className="w-3 h-3 mr-1" />
                        {area}
                      </TMLBadge>
                    ))}
                  </div>
                </div>

                {/* Subscription Info */}
                {viewingLawyer.subscription_status && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Subscription</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-medium">{viewingLawyer.subscription_status}</span>
                      </div>
                      {viewingLawyer.trial_ends_at && (
                        <div>
                          <span className="text-gray-600">Trial Ends:</span>
                          <span className="ml-2 font-medium">
                            {new Date(viewingLawyer.trial_ends_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex gap-3">
              <TMLButton variant="outline" onClick={() => setViewingLawyer(null)} className="flex-1">
                Close
              </TMLButton>
              <TMLButton 
                variant="primary" 
                onClick={handleSaveLawyerChanges} 
                className="flex-1"
                loading={saving}
              >
                <Edit className="w-4 h-4 mr-2" />
                Save Changes
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}