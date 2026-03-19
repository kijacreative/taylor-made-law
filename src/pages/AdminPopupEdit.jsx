import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Save, Upload, X, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';

const DEFAULTS = {
  name: '',
  status: 'draft',
  placement: 'dashboard',
  audience: 'all',
  trigger_type: 'on_load',
  delay_seconds: 3,
  scroll_percent: 50,
  frequency: 'once_ever',
  start_at: '',
  end_at: '',
  size: 'medium',
  image_url: '',
  image_alt: '',
  headline: '',
  body_text: '',
  link_url: '',
  link_new_tab: true,
  button_label: '',
  image_clickable: true,
  close_on_overlay: true,
};

export default function AdminPopupEdit() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const popupId = urlParams.get('id');
  const isNew = urlParams.get('new') === '1' || !popupId;

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState(DEFAULTS);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { navigate(createPageUrl('Home')); return; }
        const me = await base44.auth.me();
        if (me.role !== 'admin') { navigate(createPageUrl('LawyerDashboard')); return; }
        setUser(me);

        if (!isNew && popupId) {
          const items = await base44.entities.Popup.filter({ id: popupId });
          if (items[0]) {
            const p = items[0];
            setForm({
              name: p.name || '',
              status: p.status || 'draft',
              placement: p.placement || 'dashboard',
              audience: p.audience || 'all',
              trigger_type: p.trigger_type || 'on_load',
              delay_seconds: p.delay_seconds ?? 3,
              scroll_percent: p.scroll_percent ?? 50,
              frequency: p.frequency || 'once_ever',
              start_at: p.start_at ? p.start_at.slice(0, 16) : '',
              end_at: p.end_at ? p.end_at.slice(0, 16) : '',
              size: p.size || 'medium',
              image_url: p.image_url || '',
              image_alt: p.image_alt || '',
              headline: p.headline || '',
              body_text: p.body_text || '',
              link_url: p.link_url || '',
              link_new_tab: p.link_new_tab !== false,
              button_label: p.button_label || '',
              image_clickable: p.image_clickable !== false,
              close_on_overlay: p.close_on_overlay !== false,
            });
          }
        }
      } catch { navigate(createPageUrl('Home')); }
      finally { setAuthLoading(false); }
    };
    init();
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Pop-up name is required.', 'error'); return; }
    if (!form.image_url) { showToast('An image is required.', 'error'); return; }
    setSaving(true);
    const payload = {
      ...form,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      delay_seconds: Number(form.delay_seconds) || 0,
      scroll_percent: Number(form.scroll_percent) || 50,
    };
    try {
      if (isNew) {
        const created = await base44.entities.Popup.create(payload);
        showToast('Pop-up created!');
        navigate(createPageUrl('AdminPopupEdit') + `?id=${created.id}`, { replace: true });
      } else {
        await base44.entities.Popup.update(popupId, payload);
        showToast('Changes saved.');
      }
    } catch (err) {
      showToast(err.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('image_url', file_url);
    setUploadingImage(false);
  };

  const Toggle = ({ label, desc, field }) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <div
        onClick={() => set(field, !form[field])}
        className={`mt-0.5 w-10 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${form[field] ? 'bg-[#3a164d]' : 'bg-gray-200'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form[field] ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
    </label>
  );

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );

  const Select = ({ field, options }) => (
    <select
      value={form[field]}
      onChange={e => set(field, e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar user={user} currentPage="AdminPopups" />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AdminPopups')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{isNew ? 'New Pop-up' : 'Edit Pop-up'}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${form.status === 'active' ? 'bg-emerald-100 text-emerald-700' : form.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{form.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {toast && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {toast.msg}
              </div>
            )}
            <TMLButton variant="primary" size="sm" loading={saving} onClick={handleSave}>
              <Save className="w-4 h-4 mr-1.5" /> Save
            </TMLButton>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6">

            {/* Left — content + image */}
            <div className="col-span-2 space-y-5">

              {/* Basic info */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Info</h3>
                <TMLInput label="Pop-up Name (internal) *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., New Mass Torts Promo — Jan 2025" />
                <TMLInput label="Headline (optional)" value={form.headline} onChange={e => set('headline', e.target.value)} placeholder="e.g., New Mass Tort Opportunities Available" />
                <TMLTextarea label="Body Text (optional)" value={form.body_text} onChange={e => set('body_text', e.target.value)} placeholder="Short description shown below the headline..." rows={2} />
              </div>

              {/* Image */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Image *</h3>
                {form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt={form.image_alt || 'Pop-up image'} className="w-full max-h-64 object-cover rounded-xl" />
                    <button onClick={() => set('image_url', '')} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50">
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#3a164d]/40 hover:bg-gray-50 transition-colors">
                    {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" /> : (
                      <><ImageIcon className="w-8 h-8 text-gray-300 mb-2" /><span className="text-sm text-gray-500">Click to upload image</span><span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP — recommended 1200×600px</span></>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
                <TMLInput label="Image Alt Text" value={form.image_alt} onChange={e => set('image_alt', e.target.value)} placeholder="Describe the image for accessibility..." />
                <Toggle field="image_clickable" label="Entire image is clickable" desc="Clicking the image follows the link URL" />
              </div>

              {/* Link */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Link</h3>
                <TMLInput label="Link URL" value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="https://... or /app/mass-torts" />
                <TMLInput label="Button Label (optional)" value={form.button_label} onChange={e => set('button_label', e.target.value)} placeholder="e.g., Learn More, View Cases" />
                <Toggle field="link_new_tab" label="Open in new tab" />
              </div>

            </div>

            {/* Right — settings */}
            <div className="space-y-5">

              {/* Status */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Status</h3>
                <Field label="Status">
                  <Select field="status" options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]} />
                </Field>
                <Field label="Size">
                  <Select field="size" options={[
                    { value: 'small', label: 'Small (360px)' },
                    { value: 'medium', label: 'Medium (520px)' },
                    { value: 'large', label: 'Large (720px)' },
                  ]} />
                </Field>
              </div>

              {/* Targeting */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Targeting</h3>
                <Field label="Placement">
                  <Select field="placement" options={[
                    { value: 'dashboard', label: 'Dashboard' },
                    { value: 'community', label: 'Community' },
                    { value: 'mass_torts', label: 'Mass Torts' },
                    { value: 'blog', label: 'Blog / Resources' },
                    { value: 'all_app', label: 'All App Pages' },
                    { value: 'public_only', label: 'Public Pages (Not Logged In)' },
                  ]} />
                </Field>
                <Field label="Audience">
                  <Select field="audience" options={[
                    { value: 'all', label: 'All Lawyers' },
                    { value: 'pending', label: 'Pending Only' },
                    { value: 'approved', label: 'Approved Only' },
                  ]} />
                </Field>
              </div>

              {/* Timing */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Timing & Trigger</h3>
                <Field label="Trigger">
                  <Select field="trigger_type" options={[
                    { value: 'on_load', label: 'On Page Load' },
                    { value: 'delay', label: 'After Delay' },
                    { value: 'scroll', label: 'On Scroll' },
                  ]} />
                </Field>
                {form.trigger_type === 'delay' && (
                  <TMLInput label="Delay (seconds)" type="number" min="0" value={form.delay_seconds} onChange={e => set('delay_seconds', e.target.value)} />
                )}
                {form.trigger_type === 'scroll' && (
                  <TMLInput label="Scroll % threshold" type="number" min="0" max="100" value={form.scroll_percent} onChange={e => set('scroll_percent', e.target.value)} />
                )}
                <Field label="Frequency Cap">
                  <Select field="frequency" options={[
                    { value: 'once_ever', label: 'Once Ever' },
                    { value: 'once_per_day', label: 'Once Per Day' },
                    { value: 'once_per_session', label: 'Once Per Session' },
                    { value: 'every_visit', label: 'Every Visit' },
                  ]} />
                </Field>
              </div>

              {/* Schedule */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Schedule (optional)</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
                  <input type="datetime-local" value={form.start_at} onChange={e => set('start_at', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
                  <input type="datetime-local" value={form.end_at} onChange={e => set('end_at', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20" />
                </div>
              </div>

              {/* Behavior */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Close Behavior</h3>
                <Toggle field="close_on_overlay" label="Close on overlay click" desc="Click outside modal to close" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}