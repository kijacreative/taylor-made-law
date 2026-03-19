import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Save, Eye, Upload, X, Plus, Loader2,
  CheckCircle2, AlertCircle, Image as ImageIcon, Tag
} from 'lucide-react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import TMLButton from '@/components/ui/TMLButton';
import TMLInput from '@/components/ui/TMLInput';
import TMLTextarea from '@/components/ui/TMLTextarea';
import RichTextEditor from '@/components/blog/RichTextEditor';

const CATEGORIES = ['Updates', 'Education', 'Mass Torts', 'Compliance', 'Marketing', 'Case Management', 'Legal News'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function estimateReadTime(html) {
  const text = html?.replace(/<[^>]+>/g, '') || '';
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

export default function AdminBlogEdit() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  const isNew = urlParams.get('new') === '1' || !postId;

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    category: 'Updates',
    tags: [],
    author_name: '',
    author_email: '',
    featured_image_url: '',
    featured_image_alt: '',
    og_image_url: '',
    meta_title: '',
    meta_description: '',
    canonical_url: '',
    status: 'draft',
    is_pinned: false,
    feature_on_dashboard: false,
    post_to_community: false,
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

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

        if (!isNew && postId) {
          const posts = await base44.entities.BlogPost.filter({ id: postId });
          if (posts[0]) {
            const p = posts[0];
            setForm({
              title: p.title || '',
              slug: p.slug || '',
              excerpt: p.excerpt || '',
              body: p.body || '',
              category: p.category || 'Updates',
              tags: p.tags || [],
              author_name: p.author_name || '',
              author_email: p.author_email || '',
              featured_image_url: p.featured_image_url || '',
              featured_image_alt: p.featured_image_alt || '',
              og_image_url: p.og_image_url || '',
              meta_title: p.meta_title || '',
              meta_description: p.meta_description || '',
              canonical_url: p.canonical_url || '',
              status: p.status || 'draft',
              is_pinned: p.is_pinned || false,
              feature_on_dashboard: p.feature_on_dashboard || false,
              post_to_community: p.post_to_community || false,
            });
            setSlugManuallyEdited(true);
          }
        } else {
          setForm(f => ({ ...f, author_name: me.full_name || me.email, author_email: me.email }));
        }
      } catch { navigate(createPageUrl('Home')); }
      finally { setAuthLoading(false); }
    };
    init();
  }, []);

  // Auto-slug from title
  useEffect(() => {
    if (!slugManuallyEdited && form.title) {
      setForm(f => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title]);

  const handleSave = async (publishNow = false) => {
    if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim()) {
      showToast('Title, slug, and excerpt are required.', 'error');
      return;
    }
    publishNow ? setPublishing(true) : setSaving(true);

    const payload = {
      ...form,
      read_time_minutes: estimateReadTime(form.body),
      meta_title: form.meta_title || form.title,
      meta_description: form.meta_description || form.excerpt,
      og_image_url: form.og_image_url || form.featured_image_url,
    };

    if (publishNow) {
      payload.status = 'published';
      if (!payload.published_at) payload.published_at = new Date().toISOString();
      payload.published_by = user.email;
    }

    try {
      if (isNew) {
        const created = await base44.entities.BlogPost.create(payload);
        await base44.entities.AuditLog.create({ entity_type: 'BlogPost', entity_id: created.id, action: publishNow ? 'blog_published' : 'blog_created', actor_email: user.email }).catch(() => {});
        showToast(publishNow ? 'Post published!' : 'Post saved as draft.');
        navigate(createPageUrl('AdminBlogEdit') + `?id=${created.id}`, { replace: true });
      } else {
        await base44.entities.BlogPost.update(postId, payload);
        await base44.entities.AuditLog.create({ entity_type: 'BlogPost', entity_id: postId, action: publishNow ? 'blog_published' : 'blog_updated', actor_email: user.email }).catch(() => {});
        showToast(publishNow ? 'Post published!' : 'Changes saved.');
        setForm(f => ({ ...f, ...payload }));
      }
    } catch (err) {
      showToast(err.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleFeaturedImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, featured_image_url: file_url }));
    setUploadingImage(false);
  };

  const addTag = (e) => {
    e.preventDefault();
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3a164d]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar user={user} currentPage="AdminBlog" />

      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AdminBlog')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{isNew ? 'New Post' : 'Edit Post'}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${form.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {form.status === 'published' ? 'Published' : 'Draft'}
                </span>
                {form.slug && <span className="text-xs text-gray-400 font-mono">/blog/{form.slug}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {toast && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {toast.msg}
              </div>
            )}
            <TMLButton variant="ghost" size="sm" loading={saving} onClick={() => handleSave(false)}>
              <Save className="w-4 h-4 mr-1.5" /> Save Draft
            </TMLButton>
            <TMLButton variant="primary" size="sm" loading={publishing} onClick={() => handleSave(true)}>
              <Eye className="w-4 h-4 mr-1.5" /> {form.status === 'published' ? 'Update & Publish' : 'Publish'}
            </TMLButton>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-6">

              {/* Main content — left 2/3 */}
              <div className="col-span-2 space-y-6">

                {/* Core fields */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <TMLInput
                    label="Title *"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Your compelling blog title"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#3a164d]/20 focus-within:border-[#3a164d]">
                      <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-400 border-r border-gray-200 whitespace-nowrap">/blog/</span>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={e => { setSlugManuallyEdited(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })); }}
                        className="flex-1 px-3 py-2.5 text-sm focus:outline-none font-mono"
                        placeholder="your-post-slug"
                      />
                    </div>
                  </div>

                  <TMLTextarea
                    label="Excerpt / Summary *"
                    value={form.excerpt}
                    onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                    placeholder="A 1-2 sentence summary shown in post cards and SEO..."
                    rows={3}
                    helperText={`${form.excerpt.length}/160 chars (ideal for SEO)`}
                  />
                </div>

                {/* Body editor */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Body Content</label>
                  <RichTextEditor
                    value={form.body}
                    onChange={val => setForm(f => ({ ...f, body: val }))}
                  />
                </div>

                {/* SEO */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">SEO & Metadata</h3>
                  <TMLInput
                    label="Meta Title"
                    value={form.meta_title}
                    onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                    placeholder={form.title || 'Defaults to post title'}
                    helperText={`${form.meta_title.length}/60 chars`}
                  />
                  <TMLTextarea
                    label="Meta Description"
                    value={form.meta_description}
                    onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                    placeholder={form.excerpt || 'Defaults to excerpt'}
                    rows={2}
                    helperText={`${form.meta_description.length}/160 chars`}
                  />
                  <TMLInput
                    label="Canonical URL (optional)"
                    value={form.canonical_url}
                    onChange={e => setForm(f => ({ ...f, canonical_url: e.target.value }))}
                    placeholder="https://example.com/original-post"
                  />
                </div>
              </div>

              {/* Sidebar — right 1/3 */}
              <div className="space-y-5">

                {/* Featured Image */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Featured Image</h3>
                  {form.featured_image_url ? (
                    <div className="relative mb-3">
                      <img src={form.featured_image_url} alt={form.featured_image_alt} className="w-full h-40 object-cover rounded-xl" />
                      <button
                        onClick={() => setForm(f => ({ ...f, featured_image_url: '' }))}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#3a164d]/40 hover:bg-gray-50 transition-colors mb-3">
                      {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin text-[#3a164d]" /> : (
                        <>
                          <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                          <span className="text-sm text-gray-500">Click to upload image</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleFeaturedImageUpload} />
                    </label>
                  )}
                  <TMLInput
                    label="Alt Text"
                    value={form.featured_image_alt}
                    onChange={e => setForm(f => ({ ...f, featured_image_alt: e.target.value }))}
                    placeholder="Describe the image..."
                  />
                </div>

                {/* Classification */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Classification</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20"
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 bg-[#f5f0fa] text-[#3a164d] text-xs px-2.5 py-1 rounded-full">
                          {tag}
                          <button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                    <form onSubmit={addTag} className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        placeholder="Add tag..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a164d]/20"
                      />
                      <button type="submit" className="p-2 rounded-lg bg-[#3a164d]/10 text-[#3a164d] hover:bg-[#3a164d]/20">
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Author */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Author</h3>
                  <TMLInput
                    label="Author Name"
                    value={form.author_name}
                    onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>

                {/* Publishing Options */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Publishing Options</h3>
                  {[
                    { key: 'is_pinned', label: 'Pin to top of feed', desc: 'Always show first' },
                    { key: 'feature_on_dashboard', label: 'Feature on dashboard', desc: 'Show in Latest Resources' },
                    { key: 'post_to_community', label: 'Post to Community', desc: 'Announce in Legal Circles' },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-start gap-3 cursor-pointer group">
                      <div
                        onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
                        className={`mt-0.5 w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form[opt.key] ? 'bg-[#3a164d]' : 'bg-gray-200'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form[opt.key] ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}