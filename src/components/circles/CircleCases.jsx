import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Briefcase, MapPin, DollarSign, User, CheckCircle, X, Loader2 } from 'lucide-react';
import TMLButton from '@/components/ui/TMLButton';
import TMLCard, { TMLCardContent } from '@/components/ui/TMLCard';
import TMLBadge from '@/components/ui/TMLBadge';
import { PRACTICE_AREAS, US_STATES } from '@/components/design/DesignTokens';

const CASE_STATUS_COLORS = {
  draft: 'default',
  pending_approval: 'warning',
  available: 'success',
  accepted: 'primary',
  closed: 'default'
};

export default function CircleCases({ circleId, circle, user, isAdmin }) {
  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const queryClient = useQueryClient();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['circleCases', circleId],
    queryFn: () => base44.entities.LegalCircleCase.filter({ circle_id: circleId }, '-created_date'),
  });

  const handleCaseCreated = () => {
    setShowSubmit(false);
    queryClient.invalidateQueries({ queryKey: ['circleCases', circleId] });
  };

  const handleAccept = async (caseItem) => {
    if (!window.confirm(`Accept this case? You will be connected with the submitting attorney.`)) return;
    await base44.entities.LegalCircleCase.update(caseItem.id, {
      status: 'accepted',
      accepted_by_user_id: user.id,
      accepted_by_email: user.email,
      accepted_by_name: user.full_name,
      accepted_at: new Date().toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ['circleCases', circleId] });
    setSelectedCase(null);
  };

  if (showSubmit) {
    return (
      <SubmitCaseForm
        circleId={circleId}
        circle={circle}
        user={user}
        onSuccess={handleCaseCreated}
        onCancel={() => setShowSubmit(false)}
      />
    );
  }

  if (selectedCase) {
    return (
      <CaseDetail
        caseItem={selectedCase}
        user={user}
        isAdmin={isAdmin}
        canAccept={circle.member_can_accept_cases && selectedCase.status === 'available' && selectedCase.submitted_by_user_id !== user.id}
        onAccept={() => handleAccept(selectedCase)}
        onBack={() => setSelectedCase(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{cases.filter(c => c.status === 'available').length} available cases</p>
        {circle.member_can_submit_cases && (
          <TMLButton variant="primary" size="sm" onClick={() => setShowSubmit(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Submit Case
          </TMLButton>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" /></div>
      ) : cases.length === 0 ? (
        <TMLCard variant="cream" className="text-center py-16">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cases Yet</h3>
          <p className="text-gray-600 mb-4">Submit a case to share with circle members.</p>
          {circle.member_can_submit_cases && (
            <TMLButton variant="primary" size="sm" onClick={() => setShowSubmit(true)}>
              <Plus className="w-4 h-4 mr-2" /> Submit First Case
            </TMLButton>
          )}
        </TMLCard>
      ) : (
        cases.map(caseItem => (
          <div
            key={caseItem.id}
            onClick={() => setSelectedCase(caseItem)}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:border-[#3a164d]/30 hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{caseItem.title}</h3>
                  <TMLBadge variant={CASE_STATUS_COLORS[caseItem.status] || 'default'} size="sm">
                    {caseItem.status?.replace('_', ' ')}
                  </TMLBadge>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{caseItem.summary || caseItem.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{caseItem.state}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{caseItem.practice_area}</span>
                  {caseItem.estimated_value && (
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${caseItem.estimated_value.toLocaleString()}</span>
                  )}
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{caseItem.submitted_by_name}</span>
                </div>
              </div>
              {caseItem.status === 'available' && caseItem.submitted_by_user_id !== user.id && (
                <TMLButton variant="primary" size="sm" onClick={e => { e.stopPropagation(); setSelectedCase(caseItem); }}>
                  View
                </TMLButton>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SubmitCaseForm({ circleId, circle, user, onSuccess, onCancel }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', summary: '', description: '', state: '', practice_area: '',
    estimated_value: '', key_facts: '', client_first_name: '', client_last_name: '',
    client_email: '', client_phone: ''
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await base44.functions.invoke('submitCase', {
      circle_id: circleId,
      title: form.title,
      summary: form.summary,
      description: form.description,
      state: form.state,
      practice_area: form.practice_area,
      estimated_value: form.estimated_value || null,
      client_first_name: form.client_first_name,
      client_last_name: form.client_last_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
    });
    setSubmitting(false);
    if (res.data?.error) {
      alert(res.data.error);
      return;
    }
    onSuccess();
  };

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20 focus:border-[#3a164d]";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Submit Case to Circle</h3>
        <p className="text-sm text-gray-500 mt-1">This case will only be visible to circle members.</p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Case Title *</label>
            <input required className={inputClass} value={form.title} onChange={e => update('title', e.target.value)} placeholder="Brief case title" />
          </div>
          <div>
            <label className={labelClass}>State *</label>
            <select required className={inputClass} value={form.state} onChange={e => update('state', e.target.value)}>
              <option value="">Select state...</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Practice Area *</label>
            <select required className={inputClass} value={form.practice_area} onChange={e => update('practice_area', e.target.value)}>
              <option value="">Select area...</option>
              {PRACTICE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Summary</label>
            <input className={inputClass} value={form.summary} onChange={e => update('summary', e.target.value)} placeholder="Brief one-line summary" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea rows={4} className={inputClass} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Detailed case description..." />
          </div>
          <div>
            <label className={labelClass}>Estimated Value ($)</label>
            <input type="number" className={inputClass} value={form.estimated_value} onChange={e => update('estimated_value', e.target.value)} placeholder="e.g. 50000" />
          </div>
          <div>
            <label className={labelClass}>Key Facts (one per line)</label>
            <textarea rows={3} className={inputClass} value={form.key_facts} onChange={e => update('key_facts', e.target.value)} placeholder="- Injured in auto accident&#10;- Client has documented injuries" />
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Client Information (Circle-Private)</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name</label>
              <input className={inputClass} value={form.client_first_name} onChange={e => update('client_first_name', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input className={inputClass} value={form.client_last_name} onChange={e => update('client_last_name', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={form.client_email} onChange={e => update('client_email', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={form.client_phone} onChange={e => update('client_phone', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <TMLButton type="button" variant="outline" onClick={onCancel}>Cancel</TMLButton>
          <TMLButton type="submit" variant="primary" loading={submitting}>Submit Case</TMLButton>
        </div>
      </form>
    </div>
  );
}

function CaseDetail({ caseItem, user, isAdmin, canAccept, onAccept, onBack }) {
  const [accepting, setAccepting] = useState(false);

  const doAccept = async () => {
    setAccepting(true);
    await onAccept();
    setAccepting(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-6 border-b border-gray-100 flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-800">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-gray-900 flex-1">{caseItem.title}</h3>
        <TMLBadge variant={CASE_STATUS_COLORS[caseItem.status] || 'default'}>
          {caseItem.status?.replace('_', ' ')}
        </TMLBadge>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">State</p>
            <p className="font-medium text-gray-900">{caseItem.state}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Practice Area</p>
            <p className="font-medium text-gray-900">{caseItem.practice_area}</p>
          </div>
          {caseItem.estimated_value && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Estimated Value</p>
              <p className="font-medium text-gray-900">${caseItem.estimated_value.toLocaleString()}</p>
            </div>
          )}
        </div>

        {caseItem.description && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed">{caseItem.description}</p>
          </div>
        )}

        {caseItem.key_facts?.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Key Facts</p>
            <ul className="space-y-1">
              {caseItem.key_facts.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {caseItem.status === 'accepted' && caseItem.accepted_by_name && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800">Accepted by {caseItem.accepted_by_name}</p>
            {caseItem.accepted_at && <p className="text-xs text-green-600">{new Date(caseItem.accepted_at).toLocaleDateString()}</p>}
          </div>
        )}

        {(caseItem.client_first_name || caseItem.client_email) && (caseItem.submitted_by_user_id === user.id || isAdmin || caseItem.status === 'accepted') && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Client Contact</p>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {(caseItem.client_first_name || caseItem.client_last_name) && (
                <div><span className="text-gray-500">Name: </span><span className="text-gray-900">{caseItem.client_first_name} {caseItem.client_last_name}</span></div>
              )}
              {caseItem.client_email && <div><span className="text-gray-500">Email: </span><span className="text-gray-900">{caseItem.client_email}</span></div>}
              {caseItem.client_phone && <div><span className="text-gray-500">Phone: </span><span className="text-gray-900">{caseItem.client_phone}</span></div>}
            </div>
          </div>
        )}

        {canAccept && (
          <div className="border-t pt-4 flex justify-end">
            <TMLButton variant="primary" loading={accepting} onClick={doAccept}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Case
            </TMLButton>
          </div>
        )}
      </div>
    </div>
  );
}