import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Scale, 
  MapPin, 
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  FileText,
  User,
  Loader2
} from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';

export default function CaseDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

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
  const { data: profiles, isLoading: profileLoading } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => base44.entities.LawyerProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const lawyerProfile = profiles?.[0] || null;
  const profileLoaded = !profileLoading && profiles !== undefined;

  // Use unified user_status if available (new identity system), fall back to LawyerProfile legacy
  const userStatusApproved = user?.user_status === 'approved';
  const profileStatusApproved = lawyerProfile?.status === 'approved';
  const isApproved = profileLoaded && (userStatusApproved || (!user?.user_status && profileStatusApproved));
  const isPending = profileLoaded && !isApproved;

  // Redirect pending lawyers — only once profile is loaded
  useEffect(() => {
    if (!loading && profileLoaded && isPending) {
      navigate(createPageUrl('CaseExchange') + '?blocked=1', { replace: true });
    }
  }, [loading, profileLoaded, isPending]);

  // Get case — only for approved lawyers
  const { data: caseItem, isLoading: caseLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const cases = await base44.entities.Case.filter({ id: caseId });
      return cases[0] || null;
    },
    enabled: !!caseId && !!user && profileLoaded && isApproved,
  });

  const handleAcceptCase = async () => {
    if (!caseItem || !user) return;

    // Validation: check approval via user_status OR lawyerProfile (legacy)
    const approvedViaUserStatus = user?.user_status === 'approved';
    const approvedViaProfile = lawyerProfile?.status === 'approved';
    if (!approvedViaUserStatus && !approvedViaProfile) {
      setError('Your application must be approved before accepting cases.');
      return;
    }

    // Referral agreement check — only enforce if lawyerProfile exists
    if (lawyerProfile && !lawyerProfile.referral_agreement_accepted) {
      setError('Please accept the referral agreement before accepting cases.');
      return;
    }
    
    if (caseItem.status !== 'published') {
      setError('This case is no longer available.');
      return;
    }
    
    setAccepting(true);
    setError(null);
    
    try {
      // Update case
      await base44.entities.Case.update(caseId, {
        status: 'accepted',
        accepted_by: lawyerProfile.id,
        accepted_by_email: user.email,
        accepted_at: new Date().toISOString()
      });
      
      // Create audit log
      await base44.entities.AuditLog.create({
        entity_type: 'Case',
        entity_id: caseId,
        action: 'accept_case',
        actor_email: user.email,
        actor_role: 'lawyer',
        notes: `Case accepted by ${user.full_name || user.email}`
      });
      
      // Send notification email (placeholder)
      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: 'Taylor Made Law - Case Accepted',
          body: `
Congratulations!

You have successfully accepted the following case:

Case: ${caseItem.title}
Practice Area: ${caseItem.practice_area}
State: ${caseItem.state}
${caseItem.estimated_value ? `Estimated Value: $${caseItem.estimated_value.toLocaleString()}` : ''}

Next Steps:
1. Review the full case details in your dashboard
2. Contact the client within 24-48 hours
3. Document all communications for compliance

Client Contact Information:
${caseItem.client_first_name ? `Name: ${caseItem.client_first_name} ${caseItem.client_last_name}` : 'Will be provided shortly'}
${caseItem.client_email ? `Email: ${caseItem.client_email}` : ''}
${caseItem.client_phone ? `Phone: ${caseItem.client_phone}` : ''}

Best regards,
Taylor Made Law Team
          `.trim()
        });
      } catch (emailErr) {
        console.log('Email send attempted');
      }
      
      queryClient.invalidateQueries(['case', caseId]);
      navigate(createPageUrl('MyCases'));
    } catch (err) {
      console.error('Error accepting case:', err);
      setError('An error occurred while accepting the case. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || profileLoading || caseLoading || (profileLoaded && isPending)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7e277e]" />
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppSidebar user={user} lawyerProfile={lawyerProfile} />
        <main className="ml-64 p-8">
          <div className="max-w-4xl mx-auto text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Not Found</h2>
            <p className="text-gray-600 mb-6">The case you're looking for doesn't exist or has been removed.</p>
            <Link to={createPageUrl('CaseExchange')}>
              <TMLButton variant="primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Case Exchange
              </TMLButton>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isAvailable = caseItem.status === 'published';
  const canAccept = lawyerProfile?.status === 'approved' && lawyerProfile?.referral_agreement_accepted && isAvailable;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to={createPageUrl('CaseExchange')} className="inline-flex items-center text-gray-600 hover:text-[#7e277e] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Case Exchange
          </Link>

          {/* Case Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TMLCard variant="elevated" className="mb-6">
              <TMLCardContent className="p-8">
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {caseItem.is_trending && (
                        <TMLBadge variant="trending">
                          <TrendingUp className="w-3 h-3 mr-1" /> Trending
                        </TMLBadge>
                      )}
                      <TMLBadge variant={isAvailable ? 'success' : 'default'}>
                        {isAvailable ? 'Available' : caseItem.status === 'accepted' ? 'Accepted' : 'Not Available'}
                      </TMLBadge>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">{caseItem.title}</h1>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Scale className="w-5 h-5" />
                        <span>{caseItem.practice_area}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-5 h-5" />
                        <span>{caseItem.state}</span>
                      </div>
                    </div>
                  </div>
                  
                  {caseItem.estimated_value && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Estimated Value</p>
                      <p className="text-4xl font-bold text-emerald-600">
                        ${caseItem.estimated_value.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl mb-6">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Accept Button */}
                {isAvailable && (
                  <div className="flex items-center gap-4">
                    <TMLButton 
                      variant="primary" 
                      size="lg"
                      onClick={handleAcceptCase}
                      loading={accepting}
                      disabled={!canAccept}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Accept This Case
                    </TMLButton>
                    
                    {!canAccept && lawyerProfile && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">
                          {lawyerProfile.status !== 'approved' 
                            ? 'Approval required to accept cases'
                            : 'Accept referral agreement first'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {!isAvailable && caseItem.status === 'accepted' && (
                  <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>This case has been accepted by an attorney.</span>
                  </div>
                )}
              </TMLCardContent>
            </TMLCard>
          </motion.div>

          {/* Case Details */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <TMLCard>
                <TMLCardHeader>
                  <TMLCardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#7e277e]" />
                    Case Description
                  </TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {caseItem.description || 'No description provided.'}
                  </p>
                </TMLCardContent>
              </TMLCard>

              {/* Key Facts */}
              {caseItem.key_facts && caseItem.key_facts.length > 0 && (
                <TMLCard>
                  <TMLCardHeader>
                    <TMLCardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#7e277e]" />
                      Key Facts
                    </TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent>
                    <ul className="space-y-3">
                      {caseItem.key_facts.map((fact, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                          <span className="text-gray-700">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </TMLCardContent>
                </TMLCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Case Info */}
              <TMLCard variant="cream">
                <TMLCardHeader>
                  <TMLCardTitle>Case Information</TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Practice Area</p>
                    <p className="font-medium text-gray-900">{caseItem.practice_area}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">State</p>
                    <p className="font-medium text-gray-900">{caseItem.state}</p>
                  </div>
                  {caseItem.estimated_value && (
                    <div>
                      <p className="text-sm text-gray-500">Estimated Value</p>
                      <p className="font-medium text-emerald-600">${caseItem.estimated_value.toLocaleString()}</p>
                    </div>
                  )}
                  {caseItem.published_at && (
                    <div>
                      <p className="text-sm text-gray-500">Published</p>
                      <p className="font-medium text-gray-900">
                        {new Date(caseItem.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </TMLCardContent>
              </TMLCard>

              {/* Compliance Notice */}
              <TMLCard className="border-l-4 border-l-[#7e277e]">
                <TMLCardContent>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#7e277e] mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Referral Compliance</p>
                      <p className="text-sm text-gray-600">
                        By accepting this case, you agree to the Taylor Made Law referral agreement and applicable fee arrangement.
                      </p>
                    </div>
                  </div>
                </TMLCardContent>
              </TMLCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}