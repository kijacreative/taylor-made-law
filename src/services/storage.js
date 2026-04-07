/**
 * Storage service — wraps file upload for both Base44 and Supabase.
 *
 * All file uploads in the app should go through this service.
 * When Supabase is active, uploads go to Supabase Storage buckets.
 */
import { base44 } from '@/api/base44Client';
import { getSupabase } from '@/api/supabaseClient';
import { useSupabase, logProvider } from './provider';

/**
 * Upload a file and return { file_url }.
 * @param {File} file - Browser File object
 * @param {string} [bucket='avatars'] - Supabase Storage bucket name
 * @returns {Promise<{ file_url: string }>}
 */
export async function uploadFile(file, bucket = 'avatars') {
  if (useSupabase('auth')) {
    logProvider('auth', 'uploadFile');
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client not available');

    // Generate unique path to avoid collisions
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error } = await sb.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;

    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(data.path);
    return { file_url: urlData.publicUrl };
  }

  logProvider('auth', 'uploadFile', 'base44');
  return base44.integrations.Core.UploadFile({ file });
}
