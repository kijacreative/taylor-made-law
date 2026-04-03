import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getCurrentUser, getProfile } from '@/services/auth';
import { createCircle, createMember } from '@/services/circles';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent, TMLCardHeader, TMLCardTitle } from '@/components/ui/TMLCard';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import TMLSelect from '@/components/ui/TMLSelect';
import { Link } from 'react-router-dom';

export default function CreateGroup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_type: 'private',
    visibility: 'hidden',
    case_sharing_enabled: true,
    require_admin_approval: false,
    member_can_submit_cases: true,
    member_can_accept_cases: true,
    case_approval_required: false,
    tags: ''
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

  const { data: profiles = [] } = useQuery({
    queryKey: ['lawyerProfile', user?.id],
    queryFn: () => getProfile(user.id).then(p => p ? [p] : []),
    enabled: !!user?.id
  });

  const lawyerProfile = profiles[0] || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Generate slug
      const slug = formData.name.toLowerCase().
      replace(/[^a-z0-9]+/g, '-').
      replace(/(^-|-$)/g, '');

      // Create circle
      const circle = await createCircle({
        name: formData.name,
        slug,
        description: formData.description,
        group_type: formData.group_type,
        visibility: formData.visibility,
        case_sharing_enabled: formData.case_sharing_enabled,
        require_admin_approval: formData.require_admin_approval,
        member_can_submit_cases: formData.member_can_submit_cases,
        member_can_accept_cases: formData.member_can_accept_cases,
        case_approval_required: formData.case_approval_required,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        member_count: 1,
        is_active: true
      });

      // Add creator as admin (best effort)
      try {
        await createMember({
          circle_id: circle.id,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString()
        });
      } catch (memberErr) {
        console.warn('Could not add member record:', memberErr.message);
      }

      navigate(`${createPageUrl('GroupDetail')}?id=${circle.id}`);
    } catch (error) {
      console.error('Failed to create circle:', error);
      alert('Failed to create circle. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar user={user} lawyerProfile={lawyerProfile} />
      
      <main className="ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          <Link to={createPageUrl('Groups')} className="inline-flex items-center text-gray-600 hover:text-[#3a164d] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Circles
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Legal Circle</h1>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <TMLCard>
                <TMLCardHeader>
                  <TMLCardTitle>Basic Information</TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-4">
                  <TMLInput
                    label="Circle Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., California Personal Injury Network" />
                  
                  
                  <TMLTextarea
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the purpose and focus of this circle..."
                    rows={4} />
                  

                  <TMLInput
                    label="Tags (comma-separated)"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., Personal Injury, California, Mass Torts" />
                  
                </TMLCardContent>
              </TMLCard>

              <TMLCard>
                <TMLCardHeader>
                  <TMLCardTitle>Circle Settings</TMLCardTitle>
                </TMLCardHeader>
                <TMLCardContent className="space-y-4">
                  <TMLSelect
                    label="Circle Type"
                    value={formData.group_type}
                    onChange={(e) => setFormData({ ...formData, group_type: e.target.value })}
                    options={[
                    { value: 'private', label: 'Private' },
                    { value: 'firm_based', label: 'Firm-Based' },
                    { value: 'peer_based', label: 'Peer Network' }]
                    } />
                  

                  <TMLSelect
                    label="Visibility"
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    options={[
                    { value: 'hidden', label: 'Hidden - Invite only, not discoverable' },
                    { value: 'discoverable', label: 'Discoverable - Others can find it, but need invite to join' }]
                    } />
                  

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.case_sharing_enabled}
                        onChange={(e) => setFormData({ ...formData, case_sharing_enabled: e.target.checked })}
                        className="w-4 h-4 text-[#3a164d] rounded focus:ring-[#3a164d]" />
                      
                      <div>
                        <p className="font-medium text-gray-900">Enable Case Sharing</p>
                        <p className="text-sm text-gray-600">Allow members to share and accept cases within this circle</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.require_admin_approval}
                        onChange={(e) => setFormData({ ...formData, require_admin_approval: e.target.checked })}
                        className="w-4 h-4 text-[#3a164d] rounded focus:ring-[#3a164d]" />
                      
                      <div>
                        <p className="font-medium text-gray-900">Require Admin Approval</p>
                        <p className="text-sm text-gray-600">New member requests must be approved by admins</p>
                      </div>
                    </label>
                  </div>
                </TMLCardContent>
              </TMLCard>

              {formData.case_sharing_enabled &&
              <TMLCard>
                  <TMLCardHeader>
                    <TMLCardTitle>Case Sharing Permissions</TMLCardTitle>
                  </TMLCardHeader>
                  <TMLCardContent className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                      type="checkbox"
                      checked={formData.member_can_submit_cases}
                      onChange={(e) => setFormData({ ...formData, member_can_submit_cases: e.target.checked })}
                      className="w-4 h-4 text-[#3a164d] rounded focus:ring-[#3a164d]" />
                    
                      <div>
                        <p className="font-medium text-gray-900">Members Can Submit Cases</p>
                        <p className="text-sm text-gray-600">Allow all members to submit cases to the group</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                      type="checkbox"
                      checked={formData.member_can_accept_cases}
                      onChange={(e) => setFormData({ ...formData, member_can_accept_cases: e.target.checked })}
                      className="w-4 h-4 text-[#3a164d] rounded focus:ring-[#3a164d]" />
                    
                      <div>
                        <p className="font-medium text-gray-900">Members Can Accept Cases</p>
                        <p className="text-sm text-gray-600">Allow all members to accept available cases</p>
                      </div>
                    </label>

                    










                  
                  </TMLCardContent>
                </TMLCard>
              }

              <div className="flex justify-end gap-3">
                <Link to={createPageUrl('Groups')}>
                  <TMLButton variant="outline" type="button">
                    Cancel
                  </TMLButton>
                </Link>
                <TMLButton variant="primary" type="submit" loading={creating}>
                  <Save className="w-4 h-4 mr-2" />
                  Create Circle
                </TMLButton>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>);

}