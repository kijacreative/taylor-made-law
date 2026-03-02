import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle2, Loader2, Scale } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import TMLSelect from '@/components/ui/TMLSelect';
import { PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';

export default function SubmitCaseModal({ user, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    description: '',
    state: '',
    practice_area: '',
    estimated_value: '',
    client_first_name: '',
    client_last_name: '',
    client_email: '',
    client_phone: '',
    circle_id: '',
  });

  // Fetch circles the lawyer is a member of
  const { data: memberships = [] } = useQuery({
    queryKey: ['myCircleMemberships', user?.id],
    queryFn: () => base44.entities.LegalCircleMember.filter({ user_id: user.id, status: 'active' }),
    enabled: !!user?.id,
  });

  const { data: circles = [] } = useQuery({
    queryKey: ['circleDetails', memberships.map(m => m.circle_id).join(',')],
    queryFn: async () => {
      if (!memberships.length) return [];
      const all = await base44.entities.LegalCircle.list();
      return all.filter(c => memberships.some(m => m.circle_id === c.id));
    },
    enabled: memberships.length > 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const caseData = {
        circle_id: form.circle_id || undefined,
        title: form.title,
        summary: form.summary,
        description: form.description,
        state: form.state,
        practice_area: form.practice_area,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
        client_first_name: form.client_first_name,
        client_last_name: form.client_last_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        submitted_by_user_id: user.id,
        submitted_by_name: user.full_name,
        status: form.circle_id ? 'pending_approval' : 'draft',
      };

      if (form.circle_id) {
        await base44.entities.LegalCircleCase.create(caseData);
      } else {
        // Submit to main case exchange for admin approval
        await base44.entities.Case.create({
          title: form.title,
          description: form.description,
          state: form.state,
          practice_area: form.practice_area,
          estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
          client_first_name: form.client_first_name,
          client_last_name: form.client_last_name,
          client_email: form.client_email,
          client_phone: form.client_phone,
          status: 'draft',
        });
      }

      setStep('success');
    } catch (err) {
      setError('Failed to submit case. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Case Submitted!</h2>
          <p className="text-gray-600 mb-6">
            {form.circle_id
              ? 'Your case has been submitted to the circle for review.'
              : 'Your case has been submitted and is pending admin approval before it goes live on the exchange.'}
          </p>
          <TMLButton variant="primary" onClick={onClose} className="w-full">Done</TMLButton>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#3a164d]/10 rounded-xl">
              <Scale className="w-5 h-5 text-[#3a164d]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Submit a Case</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
          )}

          {/* Case Info */}
          <div>
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Case Information</p>
            <div className="space-y-4">
              <TMLInput
                label="Case Title"
                placeholder="e.g. Auto Accident — Houston, TX"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />
              <TMLTextarea
                label="Summary"
                placeholder="Brief summary of the case..."
                value={form.summary}
                onChange={e => set('summary', e.target.value)}
                rows={2}
              />
              <TMLTextarea
                label="Full Description"
                placeholder="Detailed case description, facts, and circumstances..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
              />
              <div className="grid grid-cols-2 gap-4">
                <TMLSelect
                  label="State"
                  placeholder="Select state..."
                  options={US_STATES.map(s => ({ value: s, label: s }))}
                  value={form.state}
                  onChange={e => set('state', e.target.value)}
                  required
                />
                <TMLSelect
                  label="Practice Area"
                  placeholder="Select practice area..."
                  options={PRACTICE_AREAS.map(p => ({ value: p, label: p }))}
                  value={form.practice_area}
                  onChange={e => set('practice_area', e.target.value)}
                  required
                />
              </div>
              <TMLInput
                label="Estimated Value ($)"
                type="number"
                placeholder="e.g. 250000"
                value={form.estimated_value}
                onChange={e => set('estimated_value', e.target.value)}
              />
            </div>
          </div>

          {/* Client Info */}
          <div>
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Client Information</p>
            <div className="grid grid-cols-2 gap-4">
              <TMLInput label="First Name" placeholder="Jane" value={form.client_first_name} onChange={e => set('client_first_name', e.target.value)} />
              <TMLInput label="Last Name" placeholder="Smith" value={form.client_last_name} onChange={e => set('client_last_name', e.target.value)} />
              <TMLInput label="Email" type="email" placeholder="jane@example.com" value={form.client_email} onChange={e => set('client_email', e.target.value)} />
              <TMLInput label="Phone" placeholder="(555) 123-4567" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} />
            </div>
          </div>

          {/* Circle Assignment */}
          <div>
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Assignment (Optional)</p>
            <TMLSelect
              label="Submit to Circle"
              placeholder="Submit to Case Exchange (admin review)"
              options={[
                { value: '', label: 'Case Exchange — pending admin approval' },
                ...circles.map(c => ({ value: c.id, label: c.name }))
              ]}
              value={form.circle_id}
              onChange={e => set('circle_id', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave blank to submit to the main Case Exchange for admin review, or choose a circle to post directly.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <TMLButton type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</TMLButton>
            <TMLButton type="submit" variant="primary" loading={submitting} className="flex-1">
              Submit Case
            </TMLButton>
          </div>
        </form>
      </div>
    </div>
  );
}