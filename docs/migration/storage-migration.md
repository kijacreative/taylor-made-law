# Storage Migration: Base44 → Supabase Storage

> Written 2026-04-02. Design document — no production changes.

---

## 1. Current State

### Upload mechanism

All uploads flow through `base44.integrations.Core.UploadFile({ file })`, which returns `{ file_url }` — a permanent, publicly accessible URL hosted on Base44's cloud storage. No auth gate on file access.

### Upload call sites (14 total)

**Frontend (9 calls via services/storage.js):**

| Call Site | File Type | Stored In |
|-----------|-----------|-----------|
| LawyerOnboarding.jsx | Profile photo | `profiles.profile_photo_url` |
| LawyerSettings.jsx | Profile photo | `profiles.profile_photo_url` |
| AdminBlogEdit.jsx | Featured image | `blog_posts.featured_image_url` |
| AdminBlogEdit.jsx | PDF download | `blog_posts.pdf_download_url` |
| AdminResourceEdit.jsx | Resource file | `resources.file_url` |
| AdminResourceEdit.jsx | PDF download | `resources.pdf_download_url` |
| AdminPopupEdit.jsx | Popup image | `popups.image_url` |
| RichTextEditor.jsx | Blog inline image | Embedded in `blog_posts.body` HTML |

**Backend via Edge Function / FormData (5 calls via service functions):**

| Call Site | File Type | Stored In |
|-----------|-----------|-----------|
| DirectMessageThread → `uploadDirectMessageFile` | DM attachment | `direct_message_files.file_url` |
| CircleChat → `uploadCircleFile` | Chat attachment | `circle_files.file_url` |
| CircleResources → `uploadCircleFile` | Shared file | `circle_files.file_url` |
| CircleDocuments → `uploadCircleDocument` | Document | `circle_documents.current_file_url` + `document_versions.file_url` |
| (backend) `createDocumentVersion` | Document revision | `document_versions.file_url` |

### Static assets (7 WordPress URLs)

Hardcoded across 18 references in 12 files:

| URL | Usage | Files |
|-----|-------|-------|
| `TaylorMadeLaw_Purple-scaled.png` | Logo (purple) | LawyerLogin, LawyerPortalLogin, Activate, SetPassword, VerifyEmail, LawyerOnboarding, CaseDetail |
| `logo-color.webp` | Logo (color) | AppSidebar, PublicNav, FindLawyer |
| `cropped-TML-concierge.png` | Avatar/mascot | AdminSidebar |
| `TaylorMadeLaw_Logo_Stacked_Cream-scaled.png` | Logo (cream) | PublicFooter |
| `Connections.jpg` | Hero image | Home |
| `tmpm185313i.webp` | Hero image | Home |
| `lawyer-meeting.jpg` | Hero image | Home |

### Database columns storing URLs (18 columns across 10 tables)

| Table | Column | Public? | Content Type |
|-------|--------|---------|-------------|
| `profiles` | `profile_photo_url` | Yes | Image |
| `lawyer_profiles` | `profile_photo_url` | Yes | Image |
| `legal_circle_members` | `profile_photo_url` | Yes | Image (denormalized) |
| `blog_posts` | `featured_image_url` | Yes | Image |
| `blog_posts` | `og_image_url` | Yes | Image |
| `blog_posts` | `pdf_download_url` | Yes | PDF |
| `blog_posts` | `body` (inline URLs) | Yes | Images embedded in HTML |
| `content_posts` | `featured_image_url` | Yes | Image |
| `resources` | `file_url` | Auth | Any (PDF, DOCX, etc.) |
| `resources` | `thumbnail_url` | Yes | Image |
| `resources` | `pdf_download_url` | Auth | PDF |
| `popups` | `image_url` | Yes | Image |
| `direct_message_files` | `file_url` | Auth | Any |
| `circle_files` | `file_url` | Auth | Any |
| `circle_documents` | `current_file_url` | Auth | Any |
| `document_versions` | `file_url` | Auth | Any |

---

## 2. Bucket Strategy

### Three buckets (already defined in 00009_audit.sql)

| Bucket | Public | Purpose | Max File Size | Allowed Types |
|--------|--------|---------|---------------|---------------|
| **`avatars`** | Yes | Profile photos | 5 MB | image/* |
| **`documents`** | No | DM files, circle files, circle documents, document versions | 50 MB | Any |
| **`content`** | Yes | Blog images, resource files, popup images, static brand assets | 50 MB | image/*, application/pdf, application/zip |

### Why three (not more)

- **avatars** is separate because it's public, small, and the most common upload type. Keeping it isolated simplifies CDN caching and size limits.
- **documents** is private because DM attachments and circle files contain attorney work product. Access requires authentication and is scoped by thread/circle membership.
- **content** is public because blog images, resource downloads, and popup images are served to all users (some behind auth check, but the files themselves are public URLs).

---

## 3. Path Naming Convention

### Format: `{owner_scope}/{owner_id}/{timestamp}-{sanitized_name}`

| Bucket | Path Pattern | Example |
|--------|-------------|---------|
| `avatars` | `{user_id}/{timestamp}-{name}` | `a1b2c3d4-..../1712073600-headshot.jpg` |
| `documents` | `dm/{thread_id}/{timestamp}-{name}` | `dm/t1234.../1712073600-contract.pdf` |
| `documents` | `circle/{circle_id}/files/{timestamp}-{name}` | `circle/c5678.../files/1712073600-notes.pdf` |
| `documents` | `circle/{circle_id}/docs/{document_id}/v{n}-{name}` | `circle/c5678.../docs/d9012.../v2-agreement.pdf` |
| `content` | `blog/{post_id}/{timestamp}-{name}` | `content/blog/p3456.../1712073600-hero.jpg` |
| `content` | `blog/inline/{timestamp}-{name}` | `content/blog/inline/1712073600-diagram.png` |
| `content` | `resources/{resource_id}/{timestamp}-{name}` | `content/resources/r7890.../1712073600-template.docx` |
| `content` | `popups/{popup_id}/{timestamp}-{name}` | `content/popups/pop1234.../1712073600-banner.jpg` |
| `content` | `brand/{name}` | `content/brand/logo-purple.png` |

### Why this convention

- **Owner scope** (`dm/`, `circle/`, `blog/`) makes RLS policies easy — check if user has access to the parent entity.
- **Timestamp prefix** prevents filename collisions when users upload `document.pdf` multiple times.
- **Sanitized name** preserves the original filename for display while removing unsafe characters.

### Name sanitization

```javascript
function sanitizePath(filename) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}
```

---

## 4. Metadata Schema

File metadata lives in existing database tables, not in Supabase Storage metadata. The `file_url` column stores the full Supabase Storage URL.

### URL format

**Public buckets (avatars, content):**
```
{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
```
Example: `http://127.0.0.1:54321/storage/v1/object/public/avatars/a1b2c3d4/1712073600-headshot.jpg`

**Private bucket (documents):**
```
{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}?token={jwt}&expires_in=3600
```
Generated at access time via `supabase.storage.from('documents').createSignedUrl(path, 3600)`

### Metadata stored in database

No additional metadata table needed. The existing tables already track:

| Column | Stored In | Example |
|--------|-----------|---------|
| `file_url` | circle_files, direct_message_files, etc. | Full Supabase Storage URL |
| `file_name` | Same tables | Original filename for display |
| `file_type` | Same tables | MIME type |
| `file_size` | Same tables | Bytes |
| `uploaded_by_user_id` | Same tables | FK to profiles |

---

## 5. Signed URL Strategy

### Public buckets: direct URL (no signing needed)

Files in `avatars` and `content` are publicly readable. The `file_url` stored in the database is a permanent public URL. No signing, no expiry, no auth check at the storage layer.

```javascript
// Upload returns permanent public URL
const { data } = await supabase.storage
  .from('avatars')
  .upload(path, file, { upsert: true });
const publicUrl = supabase.storage
  .from('avatars')
  .getPublicUrl(data.path).data.publicUrl;
// Store publicUrl in profiles.profile_photo_url
```

### Private bucket: signed URLs at access time

Files in `documents` require authentication. The stored `file_url` is the storage path (not a signed URL). Signed URLs are generated on demand with a 1-hour expiry.

```javascript
// Upload stores the path
const { data } = await supabase.storage
  .from('documents')
  .upload(path, file);
// Store data.path in direct_message_files.file_url (just the path)

// Display: generate signed URL when user needs to view/download
const { data: { signedUrl } } = await supabase.storage
  .from('documents')
  .createSignedUrl(storedPath, 3600); // 1 hour
```

### Why 1-hour expiry

- Long enough for a user to download large files or view multiple attachments in a session
- Short enough that shared/leaked URLs expire quickly
- Matches typical session duration for attorney review workflows

### Where signed URLs are generated

| Component | When | Duration |
|-----------|------|----------|
| DirectMessageThread.jsx | Message with attachment rendered | 1 hour |
| CircleChat.jsx | Chat message with attachment rendered | 1 hour |
| CircleResources.jsx | File preview modal opened | 1 hour |
| CircleDocuments.jsx | Document download clicked | 1 hour |

---

## 6. Upload / Download Permission Rules

### Upload permissions

| Bucket | Who Can Upload | RLS Policy |
|--------|---------------|------------|
| `avatars` | Any authenticated user | `auth.uid() is not null` — path must start with own user ID |
| `documents` (DM) | Thread participants | Checked by Edge Function before upload (not by storage RLS — the function uploads with service_role) |
| `documents` (circle) | Circle members | Checked by Edge Function before upload |
| `content` | Admins only | `profiles.role = 'admin'` |

### Download permissions

| Bucket | Who Can Read | Mechanism |
|--------|-------------|-----------|
| `avatars` | Anyone | Public bucket — no auth needed |
| `documents` | Authenticated users with access to parent entity | Signed URL generated only after membership/participation check |
| `content` | Anyone | Public bucket — no auth needed |

### Storage RLS policies (already in 00009_audit.sql)

```sql
-- avatars: public read, auth write (own folder)
-- documents: auth read/write (signed URL enforces access)
-- content: public read, admin write
```

### Edge Function upload flow (documents bucket)

```
1. Frontend sends file + metadata via FormData
2. Edge Function verifies:
   a. User is authenticated (JWT)
   b. User is participant/member of thread/circle
3. Edge Function uploads to documents bucket using service_role key
4. Edge Function inserts metadata row (direct_message_files / circle_files)
5. Returns { file_url: storedPath } to frontend
```

This pattern ensures RLS on the storage bucket doesn't need to know about thread/circle membership — the Edge Function handles authorization before uploading.

---

## 7. Migration Scripts for Legacy File References

### Phase A: WordPress static assets → content bucket

These 7 images are hardcoded in frontend code. Migration approach:

1. Download all 7 WordPress images
2. Upload to `content/brand/` in Supabase Storage
3. Replace hardcoded URLs in source code with Supabase public URLs

```bash
# scripts/migration/storage/migrate-wp-assets.sh

BUCKET="content"
SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
ASSETS_DIR="scripts/migration/storage/wp-assets"

mkdir -p "$ASSETS_DIR"

# Download
declare -A ASSETS=(
  ["logo-purple.png"]="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Purple-scaled.png"
  ["logo-cream.png"]="https://taylormadelaw.com/wp-content/uploads/2026/02/TaylorMadeLaw_Logo_Stacked_Cream-scaled.png"
  ["logo-color.webp"]="https://taylormadelaw.com/wp-content/uploads/2025/06/logo-color.webp"
  ["mascot.png"]="https://taylormadelaw.com/wp-content/uploads/2025/06/cropped-TML-concierge.png"
  ["hero-connections.jpg"]="https://taylormadelaw.com/wp-content/uploads/2025/11/Connections.jpg"
  ["hero-meeting.webp"]="https://taylormadelaw.com/wp-content/uploads/2025/11/tmpm185313i.webp"
  ["hero-lawyer.jpg"]="https://taylormadelaw.com/wp-content/uploads/2025/06/lawyer-meeting.jpg"
)

for name in "${!ASSETS[@]}"; do
  curl -sL "${ASSETS[$name]}" -o "$ASSETS_DIR/$name"
  echo "Downloaded: $name"
done

# Upload to Supabase Storage (requires service_role key)
# Then update source code references
```

### Phase B: Base44-hosted file URLs → Supabase Storage

Files already uploaded to Base44 (profile photos, blog images, DM attachments, circle files) have permanent Base44 URLs stored in database columns. Two strategies:

**Strategy 1: Lazy migration (recommended for launch)**
- Keep existing Base44 URLs in database columns — they're permanent and still work
- New uploads go to Supabase Storage
- Over time, old URLs naturally get replaced as users update their photos, admins re-upload blog images, etc.
- No bulk file copy needed at launch

**Strategy 2: Bulk migration (post-launch)**
- Query every row with a file_url that starts with a Base44 domain
- Download each file
- Re-upload to appropriate Supabase Storage bucket
- Update the database column with the new Supabase URL
- Log successes and failures

```javascript
// scripts/migration/storage/migrate-file-urls.js (Phase B)

async function migrateTable(supabase, tableName, urlColumn, bucket, pathPrefix) {
  const { data: rows } = await supabase
    .from(tableName)
    .select(`id, ${urlColumn}`)
    .not(urlColumn, 'is', null)
    .not(urlColumn, 'like', `%${SUPABASE_URL}%`); // skip already-migrated

  for (const row of rows) {
    const oldUrl = row[urlColumn];
    if (!oldUrl || oldUrl.startsWith(SUPABASE_URL)) continue;

    try {
      // Download from Base44
      const response = await fetch(oldUrl);
      const blob = await response.blob();
      const filename = oldUrl.split('/').pop() || 'file';
      const storagePath = `${pathPrefix}/${row.id}/${Date.now()}-${filename}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, blob, { contentType: response.headers.get('content-type') });

      if (error) throw error;

      // Get new URL
      const newUrl = bucket === 'documents'
        ? storagePath  // private: store path, sign at access time
        : supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;

      // Update database
      await supabase.from(tableName).update({ [urlColumn]: newUrl }).eq('id', row.id);

      log({ table: tableName, id: row.id, old: oldUrl, new: newUrl, status: 'ok' });
    } catch (err) {
      log({ table: tableName, id: row.id, old: oldUrl, error: err.message, status: 'error' });
    }
  }
}
```

### File URL migration map

| Table | Column | Bucket | Path Prefix | Phase |
|-------|--------|--------|-------------|-------|
| `profiles` | `profile_photo_url` | `avatars` | `{user_id}` | B |
| `lawyer_profiles` | `profile_photo_url` | `avatars` | `{user_id}` | B |
| `blog_posts` | `featured_image_url` | `content` | `blog/{post_id}` | B |
| `blog_posts` | `og_image_url` | `content` | `blog/{post_id}` | B |
| `blog_posts` | `pdf_download_url` | `content` | `blog/{post_id}` | B |
| `blog_posts` | `body` (inline URLs) | `content` | `blog/inline` | B (regex replace in HTML) |
| `content_posts` | `featured_image_url` | `content` | `content-posts/{post_id}` | B |
| `resources` | `file_url` | `content` | `resources/{resource_id}` | B |
| `resources` | `thumbnail_url` | `content` | `resources/{resource_id}` | B |
| `resources` | `pdf_download_url` | `content` | `resources/{resource_id}` | B |
| `popups` | `image_url` | `content` | `popups/{popup_id}` | B |
| `direct_message_files` | `file_url` | `documents` | `dm/{thread_id}` | B |
| `circle_files` | `file_url` | `documents` | `circle/{circle_id}/files` | B |
| `circle_documents` | `current_file_url` | `documents` | `circle/{circle_id}/docs/{doc_id}` | B |
| `document_versions` | `file_url` | `documents` | `circle/{circle_id}/docs/{doc_id}` | B |

### Phase C: RichTextEditor migration

The `RichTextEditor.jsx` embeds Base44 file URLs directly in blog post HTML (`<img src="https://base44-cdn/...">`). These need regex replacement in the `blog_posts.body` column:

```sql
-- After bulk file migration, update inline URLs in blog post bodies
UPDATE blog_posts
SET body = regexp_replace(
  body,
  'https://[^"'']*base44[^"'']*',
  '{new_supabase_url}',
  'g'
)
WHERE body LIKE '%base44%';
```

This is fragile and should be done with a script that builds a URL mapping table first, then does targeted replacements rather than blind regex.

---

## 8. Service Layer Changes (for reference — not implemented yet)

### Current: `services/storage.js`

```javascript
export function uploadFile(file) {
  return base44.integrations.Core.UploadFile({ file });
}
```

### Target: `services/storage.js`

```javascript
import { supabase } from '@/api/supabaseClient';

export async function uploadFile(file, { bucket = 'content', path } = {}) {
  const safeName = sanitizePath(file.name);
  const storagePath = path || `uploads/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // For public buckets, return permanent URL
  // For private buckets, return the path (caller generates signed URL)
  if (['avatars', 'content'].includes(bucket)) {
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { file_url: publicUrl };
  }
  return { file_url: data.path };
}

export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

function sanitizePath(filename) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}
```

### Callers would change from:

```javascript
const { file_url } = await uploadFile(file);
```

### To:

```javascript
// Profile photo → avatars bucket
const { file_url } = await uploadFile(file, { bucket: 'avatars', path: `${userId}/${Date.now()}-photo.jpg` });

// Blog image → content bucket
const { file_url } = await uploadFile(file, { bucket: 'content', path: `blog/${postId}/${Date.now()}-${file.name}` });

// DM attachment → documents bucket (handled by Edge Function, not frontend)
```

---

## 9. Unmigrated Reference: RichTextEditor.jsx

`src/components/blog/RichTextEditor.jsx` still has a direct `base44` import that bypasses the storage service:

```javascript
const { base44 } = await import('@/api/base44Client');
const { file_url } = await base44.integrations.Core.UploadFile({ file });
```

This must be migrated to use `uploadFile` from `services/storage.js` before the storage cutover. Tracked as a known gap.

---

## 10. Migration Order

| Phase | What | When | Risk |
|-------|------|------|------|
| **A** | WordPress static assets → `content/brand/` + update source code | Pre-cutover | Low — 7 files, one-time |
| **Service swap** | `services/storage.js` → Supabase Storage client | Cutover day | Medium — all new uploads go to Supabase |
| **Fix RichTextEditor** | Migrate direct `base44` import to storage service | Cutover day | Low — 1 file |
| **B** | Bulk file URL migration (download from Base44, re-upload to Supabase) | Post-cutover | Medium — large volume, can be incremental |
| **C** | Blog body inline URL replacement | Post-cutover (after B) | Low — regex on HTML column |
