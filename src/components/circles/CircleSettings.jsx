import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2, AlertTriangle } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';

export default function CircleSettings({ circle, members, isAdmin }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: circle.name,
    description: circle.description || '',
    case_sharing_enabled: circle.case_sharing_enabled,
    require_admin_approval: circle.require_admin_approval,
    member_can_submit_cases: circle.member_can_submit_cases,
    member_can_accept_cases: circle.member_can_accept_cases,
    case_approval_required: circle.case_approval_required,
    visibility: circle.visibility
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.LegalCircle.update(circle.id, {
      name: form.name,
      description: form.description,
      case_sharing_enabled: form.case_sharing_enabled,
      require_admin_approval: form.require_admin_approval,
      member_can_submit_cases: form.member_can_submit_cases,
      member_can_accept_cases: form.member_can_accept_cases,
      case_approval_required: form.case_approval_required,
      visibility: form.visibility
    });
    queryClient.invalidateQueries({ queryKey: ['legalCircle', circle.id] });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${circle.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    // Remove all members first
    for (const m of members) {
      await base44.entities.LegalCircleMember.update(m.id, { status: 'removed' }).catch(() => {});
    }
    await base44.entities.LegalCircle.update(circle.id, { is_active: false });
    navigate(createPageUrl('Groups'));
  };

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]";
  const checkboxRow = (key, label, desc) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={form[key]}
        onChange={e => update(key, e.target.checked)}
        className="w-4 h-4 mt-0.5 text-[#3a164d] rounded focus:ring-[#3a164d]"
      />
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </label>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Circle Settings</h3>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className={labelClass}>Circle Name *</label>
            <input required className={inputClass} value={form.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={3} className={inputClass} value={form.description} onChange={e => update('description', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Visibility</label>
            <select className={inputClass} value={form.visibility} onChange={e => update('visibility', e.target.value)}>
              <option value="hidden">Hidden - Invite only</option>
              <option value="discoverable">Discoverable</option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            {checkboxRow('case_sharing_enabled', 'Enable Case Sharing', 'Allow members to share cases in this circle')}
            {checkboxRow('require_admin_approval', 'Require Admin Approval for Members', 'New member invites need admin approval')}
            {form.case_sharing_enabled && checkboxRow('member_can_submit_cases', 'Members Can Submit Cases', 'Allow all members to submit cases')}
            {form.case_sharing_enabled && checkboxRow('member_can_accept_cases', 'Members Can Accept Cases', 'Allow all members to accept open cases')}
            {form.case_sharing_enabled && checkboxRow('case_approval_required', 'Case Approval Required', 'Submitted cases need admin approval before becoming visible')}
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end">
          <TMLButton type="submit" variant="primary" loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </TMLButton>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-100 shadow-sm">
        <div className="p-6 border-b border-red-50">
          <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">Deleting a circle is permanent and cannot be undone. All messages and cases will be inaccessible.</p>
          <TMLButton
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            loading={deleting}
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Circle
          </TMLButton>
        </div>
      </div>
    </div>
  );
}