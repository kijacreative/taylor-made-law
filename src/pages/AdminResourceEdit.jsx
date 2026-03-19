import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Upload, Link2, Loader2, Star, X, Plus } from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';

const CATEGORIES = [
  'Mass Torts', 'Case Management', 'Compliance', 'Marketing', 'Billing & Finance',
  'Templates', 'Legal Education', 'Platform Guide', 'Forms', 'Other'
];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function AdminResourceEdit() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    title: '', slug: '', description: '',
    resource_type: 'upload',
    file_url: '', file_name: '', file_type: '', file_size: 0,
    external_url: '', external_new_tab: true,
    thumbnail_url: '', category: '', tags: [],
    is_featured: false, visibility: 'approved_only', status: 'draft',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    base44.auth.me().then(async u => {
      if (!u || u.role !== 'admin') { navigate(createPageUrl('Home')); return; }
      setUser(u);
      if (id) {
        setEditingId(id);
        const items = await base44.entities.Resource.filter({ id });
        if (items?.[0]) setForm(f => ({ ...f, ...items[0] }));
      }
      setLoading(false);
    }).catch(() => navigate(createPageUrl('Home')));
  }, []);

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm(f => ({ ...f, title, slug: f.slug || slugify(title) }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    setForm(f => ({
      ...f, file_url,
      file_name: file.name,
      file_type: ext,
      file_size: file.size,
    }));
    setUploading(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const handleSave = async (publish = false) => {
    if (!form.title.trim()) return alert('Title is required.');
    if (!form.slug.trim()) return alert('Slug is required.');
    if (form.resource_type === 'upload' && !form.file_url) return alert('Please upload a file.');
    if (form.resource_type === 'external_link' && !form.external_url) return alert('External URL is required.');

    setSaving(true);
    const data = {
      ...form,
      status: publish ? 'published' : form.status,
      published_at: publish && form.status !== 'published' ? new Date().toISOString() : form.published_at,
    };

    if (editingId) {
      await base44.entities.Resource.update(editingId, data);
    } else {
      await base44.entities.Resource.create(data);
    }
    setSaving(false);
    navigate(createPageUrl('AdminResources'));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <Loader2 className="w-8 h-8 text-[#3a164d] animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar user={user} />
      <main className="flex-1 ml-64 p-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('AdminResources')}>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{editingId ? 'Edit Resource' : 'New Resource'}</h1>
            <p className="text-gray-400 text-sm">{editingId ? 'Update resource details' : 'Add a new resource to the library'}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Title + Slug */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Basic Info</h2>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1.5">Title <span className="text-red-400">*</span></label>
              <input
                value={form.title} onChange={handleTitleChange}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#3a164d] focus:outline-none"
                placeholder="e.g. Mass Tort Intake Guide 2025"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1.5">Slug <span className="text-red-400">*</span></label>
              <input
                value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#3a164d] focus:outline-none font-mono text-sm"
                placeholder="mass-tort-intake-guide-2025"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1.5">Description <span className="text-red-400">*</span></label>
              <textarea
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#3a164d] focus:outline-none resize-none"
                placeholder="Describe this resource..."
              />
            </div>
          </div>

          {/* Resource Type */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Resource Content</h2>
            <div className="flex gap-3">
              {[['upload', 'Upload File', Upload], ['external_link', 'External Link', Link2]].map(([val, label, Icon]) => (
                <button
                  key={val}
                  onClick={() => setForm(f => ({ ...f, resource_type: val }))}
                  className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all text-sm ${
                    form.resource_type === val
                      ? 'border-[#3a164d] bg-[#3a164d]/20 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {form.resource_type === 'upload' && (
              <div className="space-y-3">
                <label className="text-gray-300 text-sm font-medium block">File <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.pptx,.zip,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden" id="fileInput"
                  />
                  <label htmlFor="fileInput" className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-[#3a164d] transition-colors">
                    {uploading ? <Loader2 className="w-5 h-5 text-[#3a164d] animate-spin" /> : <Upload className="w-5 h-5 text-gray-400" />}
                    <span className="text-gray-400 text-sm">
                      {uploading ? 'Uploading…' : form.file_name ? form.file_name : 'Click to upload (PDF, DOCX, XLSX, PPTX, ZIP, PNG/JPG — max 50MB)'}
                    </span>
                  </label>
                </div>
                {form.file_url && (
                  <div className="flex items-center gap-3 bg-emerald-900/30 border border-emerald-700/40 rounded-lg px-4 py-3">
                    <span className="text-emerald-400 text-sm font-medium">{form.file_name}</span>
                    <span className="text-gray-500 text-xs">{formatBytes(form.file_size)}</span>
                    <span className="text-gray-500 text-xs uppercase">{form.file_type}</span>
                  </div>
                )}
              </div>
            )}

            {form.resource_type === 'external_link' && (
              <div className="space-y-3">
                <label className="text-gray-300 text-sm font-medium block">External URL <span className="text-red-400">*</span></label>
                <input
                  type="url"
                  value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#3a164d] focus:outline-none"
                  placeholder="https://..."
                />
                <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                  <input
                    type="checkbox" checked={form.external_new_tab}
                    onChange={e => setForm(f => ({ ...f, external_new_tab: e.target.checked }))}
                    className="rounded"
                  />
                  Open in new tab
                </label>
              </div>
            )}
          </div>

          {/* Organization */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Organization</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">Category</label>
                <select
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#3a164d] focus:outline-none"
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">Visibility</label>
                <select
                  value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#3a164d] focus:outline-none"
                >
                  <option value="approved_only">Approved Lawyers Only</option>
                  <option value="all_lawyers">All Lawyers</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1.5">Tags</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {form.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-[#3a164d]/60 text-purple-200 text-xs px-3 py-1 rounded-full">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-white ml-0.5"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-[#3a164d] focus:outline-none text-sm"
                  placeholder="Add tag and press Enter"
                />
                <button onClick={addTag} className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
              <input
                type="checkbox" checked={form.is_featured}
                onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                className="rounded"
              />
              <Star className="w-4 h-4 text-yellow-400" /> Mark as Featured
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-8">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save as Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-6 py-3 bg-[#3a164d] hover:bg-[#2a1038] text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save &amp; Publish
            </button>
            <Link to={createPageUrl('AdminResources')} className="ml-auto">
              <button className="px-6 py-3 text-gray-400 hover:text-white rounded-lg font-medium transition-colors">Cancel</button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}