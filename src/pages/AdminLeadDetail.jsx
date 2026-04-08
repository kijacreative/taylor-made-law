import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser } from '@/services/auth';
import { filterLeads, updateLead, createCase } from '@/services/cases';
import { filterAuditLogs, sendEmail } from '@/services/admin';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Scale,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  FileText,
  Shield,
  Building2,
  Loader2,
  MessageSquare
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import TMLTextarea from '@/components/ui/TMLTextarea';
import TMLInput from '@/components/ui/TMLInput';
import { LEAD_STATUSES, URGENCY_LEVELS } from '@/components/design/DesignTokens';

export default function AdminLeadDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) {
          navigate(createPageUrl('Home'));
          return;
        }
        
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

  // Get lead
  const { data: lead, isLoading: leadLoading, refetch } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const leads = await filterLeads({ id: leadId });
      return leads[0] || null;
    },
    enabled: !!leadId,
  });

  // Get audit logs for this lead
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['leadAuditLogs', leadId],
    queryFn: () => filterAuditLogs({ entity_type: 'Lead', entity_id: leadId }, '-created_date'),
    enabled: !!leadId,
  });

  useEffect(() => {
    if (lead) {
      setInternalNotes(lead.internal_notes || '');
      setEstimatedValue(lead.estimated_value?.toString() || '');
    }
  }, [lead]);

  const isJuniorAssociate = user?.user_type === 'junior_associate';
  const isSeniorOrAdmin = ['admin', 'senior_associate'].includes(user?.user_type) || user?.role === 'admin';

  const createAuditLog = async (action, notes, beforeState, afterState) => {
    await createAuditLog({
      entity_type: 'Lead',
      entity_id: leadId,
      action,
      actor_email: user.email,
      actor_role: user.user_type || user.role,
      before_state: JSON.stringify(beforeState),
      after_state: JSON.stringify(afterState),
      notes
    });
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    setSaving(true);
    setError(null);
    
    try {
      const beforeState = { internal_notes: lead.internal_notes, estimated_value: lead.estimated_value };
      
      await updateLead(leadId, {
        internal_notes: internalNotes,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null
      });
      
      await createAuditLog('update_notes', 'Notes and estimated value updated', beforeState, {
        internal_notes: internalNotes,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null
      });
      
      setSuccess('Notes saved successfully');
      refetch();
    } catch (err) {
      setError('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus, recommendation = null) => {
    if (!lead) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const beforeState = { status: lead.status };
      const updateData = { status: newStatus };
      
      if (isJuniorAssociate && recommendation) {
        updateData.junior_reviewer = user.email;
        updateData.junior_reviewed_at = new Date().toISOString();
        updateData.junior_recommendation = recommendation;
      }
      
      if (isSeniorOrAdmin) {
        updateData.senior_reviewer = user.email;
        updateData.senior_reviewed_at = new Date().toISOString();
      }
      
      await updateLead(leadId, updateData);
      
      await createAuditLog(
        `status_change_${newStatus}`,
        `Status changed from ${lead.status} to ${newStatus}${recommendation ? ` (Recommendation: ${recommendation})` : ''}`,
        beforeState,
        updateData
      );
      
      setSuccess(`Lead status updated to ${LEAD_STATUSES[newStatus]?.label || newStatus}`);
      refetch();
      queryClient.invalidateQueries(['allLeads']);
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!lead || !rejectionReason) return;
    setSaving(true);
    setError(null);
    
    try {
      const beforeState = { status: lead.status };
      
      await updateLead(leadId, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        senior_reviewer: user.email,
        senior_reviewed_at: new Date().toISOString()
      });
      
      await createAuditLog('reject', `Rejected: ${rejectionReason}`, beforeState, {
        status: 'rejected',
        rejection_reason: rejectionReason
      });
      
      // Send rejection email
      try {
        await sendEmail({
          to: lead.email,
          subject: 'Taylor Made Law - Update on Your Request',
          body: `
Dear ${lead.first_name},

Thank you for contacting Taylor Made Law regarding your legal matter.

After reviewing your request, we regret to inform you that we are unable to assist with your case at this time. 

${rejectionReason}

We encourage you to reach out to your local bar association for a referral to an attorney who may be able to help.

Thank you for considering Taylor Made Law.

Best regards,
Taylor Made Law Team
          `.trim()
        });
      } catch (emailErr) {
        console.log('Email send attempted');
      }
      
      setShowRejectModal(false);
      setSuccess('Lead rejected and client notified');
      refetch();
      queryClient.invalidateQueries(['allLeads']);
    } catch (err) {
      setError('Failed to reject lead');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToMarketplace = async () => {
    if (!lead) return;
    setSaving(true);
    setError(null);
    
    try {
      // Create case from lead
      const caseData = {
        lead_id: leadId,
        title: `${lead.practice_area} Case - ${lead.state}`,
        description: lead.description,
        state: lead.state,
        practice_area: lead.practice_area,
        estimated_value: lead.estimated_value || estimatedValue ? parseFloat(estimatedValue) : null,
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: user.email,
        client_first_name: lead.first_name,
        client_last_name: lead.last_name,
        client_email: lead.email,
        client_phone: lead.phone
      };
      
      await createCase(caseData);
      
      // Update lead status
      await updateLead(leadId, {
        status: 'published',
        senior_reviewer: user.email,
        senior_reviewed_at: new Date().toISOString()
      });
      
      await createAuditLog('publish_marketplace', 'Published to Case Exchange', { status: lead.status }, { status: 'published' });
      
      setSuccess('Case published to marketplace!');
      refetch();
      queryClient.invalidateQueries(['allLeads']);
      queryClient.invalidateQueries(['allCases']);
    } catch (err) {
      setError('Failed to publish case');
    } finally {
      setSaving(false);
    }
  };

  const handleRouteToCochran = async () => {
    if (!lead) return;
    setSaving(true);
    setError(null);
    
    try {
      await updateLead(leadId, {
        status: 'routed_cochran',
        senior_reviewer: user.email,
        senior_reviewed_at: new Date().toISOString()
      });
      
      await createAuditLog('route_cochran', 'Routed to Cochran Firm', { status: lead.status }, { status: 'routed_cochran' });
      
      // Send email to Cochran with case information
      try {
        await sendEmail({
          to: 'pburns@cochrantexas.com',
          subject: `New Case Referral - ${lead.practice_area} (${lead.state})`,
          body: `
New Case Referral from Taylor Made Law

CLIENT INFORMATION:
Name: ${lead.first_name} ${lead.last_name}
Email: ${lead.email}
Phone: ${lead.phone}

CASE DETAILS:
State: ${lead.state}
Practice Area: ${lead.practice_area}
Urgency: ${lead.urgency || 'Not specified'}
${lead.estimated_value ? `Estimated Value: $${lead.estimated_value.toLocaleString()}` : ''}

CASE DESCRIPTION:
${lead.description}

${lead.internal_notes ? `INTERNAL NOTES:\n${lead.internal_notes}` : ''}

Lead ID: ${leadId}
Submitted: ${new Date(lead.created_date).toLocaleString()}

---
This lead has been routed to Cochran Firm by ${user.email}
          `.trim()
        });
      } catch (emailErr) {
        console.log('Email send attempted');
      }
      
      setSuccess('Lead routed to Cochran Firm and email notification sent');
      refetch();
      queryClient.invalidateQueries(['allLeads']);
    } catch (err) {
      setError('Failed to route lead');
    } finally {
      setSaving(false);
    }
  };

  if (loading || leadLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminSidebar user={user} />
        <main className="ml-64 p-8">
          <div className="max-w-4xl mx-auto text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead Not Found</h2>
            <Link to={createPageUrl('AdminLeads')}>
              <TMLButton variant="primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leads
              </TMLButton>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const urgencyInfo = URGENCY_LEVELS.find(u => u.value === lead.urgency);

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar user={user} />
      
      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Link to={createPageUrl('AdminLeads')} className="inline-flex items-center text-gray-600 hover:text-[#3a164d] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads Queue
          </Link>

          {/* Messages */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-xl"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{success}</span>
            </motion.div>
          )}
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Lead Header */}
          <TMLCard variant="elevated" className="mb-6">
            <TMLCardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3a164d] to-[#993333] flex items-center justify-center text-white text-xl font-semibold">
                    {lead.first_name?.charAt(0)}{lead.last_name?.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                      <TMLBadge 
                        variant={
                          lead.status === 'new' ? 'info' :
                          lead.status === 'approved' ? 'success' :
                          lead.status === 'rejected' ? 'danger' :
                          lead.status === 'published' ? 'success' :
                          'warning'
                        }
                      >
                        {LEAD_STATUSES[lead.status]?.label || lead.status}
                      </TMLBadge>
                      {lead.urgency && urgencyInfo && (
                        <TMLBadge variant={lead.urgency === 'urgent' ? 'danger' : lead.urgency === 'high' ? 'warning' : 'default'}>
                          {urgencyInfo.label}
                        </TMLBadge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-sm text-gray-500">
                  <p>Submitted {new Date(lead.created_date).toLocaleDateString()}</p>
                  <p>{new Date(lead.created_date).toLocaleTimeString()}</p>
                </div>
              </div>
            </TMLCardContent>
          </TMLCard>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Info */}
              <TMLCard>
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-[#3a164d]" />
                    Contact Information
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a href={`mailto:${lead.email}`} className="text-[#3a164d] hover:underline">{lead.email}</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <a href={`tel:${lead.phone}`} className="text-[#3a164d] hover:underline">{lead.phone}</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">State</p>
                      <p className="font-medium">{lead.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Practice Area</p>
                      <p className="font-medium">{lead.practice_area}</p>
                    </div>
                  </div>
                </TMLCardContent>
              </TMLCard>

              {/* Case Description */}
              <TMLCard>
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#3a164d]" />
                    Case Description
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {lead.description || 'No description provided.'}
                  </p>
                </TMLCardContent>
              </TMLCard>

              {/* Internal Notes */}
              <TMLCard>
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#3a164d]" />
                    Internal Notes
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-4">
                  <TMLTextarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={4}
                    placeholder="Add internal notes about this lead..."
                  />
                  
                  <TMLInput
                    label="Estimated Case Value ($)"
                    type="number"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="Enter estimated value"
                  />
                  
                  <TMLButton variant="outline" onClick={handleSaveNotes} loading={saving}>
                    Save Notes
                  </TMLButton>
                </TMLCardContent>
              </TMLCard>

              {/* Activity Log */}
              <TMLCard>
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#3a164d]" />
                    Activity Log
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent>
                  {auditLogs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No activity recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-gray-900">
                              <span className="font-medium">{log.actor_email}</span>
                              {' '}{log.notes || log.action}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {new Date(log.created_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TMLCardContent>
              </TMLCard>
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              {/* Actions Card */}
              <TMLCard variant="elevated">
                <TMLCardHeader>
                  <TMLCardTitle>Actions</TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-3">
                  {/* Junior Associate Actions */}
                  {isJuniorAssociate && lead.status === 'new' && (
                    <>
                      <TMLButton 
                        variant="primary" 
                        className="w-full"
                        onClick={() => handleStatusChange('junior_review')}
                        loading={saving}
                      >
                        Start Review
                      </TMLButton>
                    </>
                  )}
                  
                  {isJuniorAssociate && lead.status === 'junior_review' && (
                    <>
                      <TMLButton 
                        variant="success" 
                        className="w-full"
                        onClick={() => handleStatusChange('senior_review', 'approve')}
                        loading={saving}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Recommend Approve
                      </TMLButton>
                      <TMLButton 
                        variant="danger" 
                        className="w-full"
                        onClick={() => handleStatusChange('senior_review', 'reject')}
                        loading={saving}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Recommend Reject
                      </TMLButton>
                    </>
                  )}

                  {/* Senior/Admin Actions */}
                  {isSeniorOrAdmin && ['new', 'junior_review', 'senior_review', 'approved'].includes(lead.status) && (
                    <>
                      {lead.status !== 'approved' && (
                        <TMLButton 
                          variant="success" 
                          className="w-full"
                          onClick={() => handleStatusChange('approved')}
                          loading={saving}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve Lead
                        </TMLButton>
                      )}
                      
                      {(lead.status === 'approved' || lead.status === 'senior_review') && (
                        <>
                          <TMLButton 
                            variant="primary" 
                            className="w-full"
                            onClick={handlePublishToMarketplace}
                            loading={saving}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Publish to Marketplace
                          </TMLButton>
                          
                          <TMLButton 
                            variant="accent" 
                            className="w-full"
                            onClick={handleRouteToCochran}
                            loading={saving}
                          >
                            <Building2 className="w-4 h-4 mr-2" />
                            Route to Cochran
                          </TMLButton>
                        </>
                      )}
                      
                      <TMLButton 
                        variant="danger" 
                        className="w-full"
                        onClick={() => setShowRejectModal(true)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Lead
                      </TMLButton>
                    </>
                  )}

                  {lead.status === 'published' && (
                    <div className="p-4 bg-emerald-50 rounded-lg text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <p className="font-medium text-emerald-700">Published to Marketplace</p>
                    </div>
                  )}

                  {lead.status === 'rejected' && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="font-medium text-red-700 text-center">Rejected</p>
                      {lead.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2">{lead.rejection_reason}</p>
                      )}
                    </div>
                  )}
                </TMLCardContent>
              </TMLCard>

              {/* Reviewer Info */}
              {(lead.junior_reviewer || lead.senior_reviewer) && (
                <TMLCard variant="cream">
                  <TMLCardHeader>
                    <TMLCardTitle className="text-base">Review History</TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent className="space-y-3 text-sm">
                    {lead.junior_reviewer && (
                      <div>
                        <p className="text-gray-500">Junior Review</p>
                        <p className="font-medium">{lead.junior_reviewer}</p>
                        {lead.junior_recommendation && (
                          <TMLBadge 
                            variant={lead.junior_recommendation === 'approve' ? 'success' : 'danger'} 
                            size="sm"
                            className="mt-1"
                          >
                            {lead.junior_recommendation}
                          </TMLBadge>
                        )}
                      </div>
                    )}
                    {lead.senior_reviewer && (
                      <div>
                        <p className="text-gray-500">Senior Review</p>
                        <p className="font-medium">{lead.senior_reviewer}</p>
                      </div>
                    )}
                  </TMLCardContent>
                </TMLCard>
              )}

              {/* Consent Info */}
              {lead.consent_given && (
                <TMLCard variant="cream">
                  <TMLCardContent className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-gray-900">Consent Verified</p>
                      <p className="text-sm text-gray-500">Version {lead.consent_version}</p>
                    </div>
                  </TMLCardContent>
                </TMLCard>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Lead</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for rejection. This will be sent to the client.</p>
            
            <TMLTextarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
              className="mb-4"
            />
            
            <div className="flex gap-3">
              <TMLButton variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">
                Cancel
              </TMLButton>
              <TMLButton 
                variant="danger" 
                onClick={handleReject} 
                className="flex-1"
                loading={saving}
                disabled={!rejectionReason}
              >
                Reject & Notify
              </TMLButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}