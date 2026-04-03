/**
 * Storage service — wraps Base44 Core.UploadFile.
 *
 * All file uploads in the app should go through this service.
 * During migration, swap the implementation here without touching callers.
 */
import { base44 } from '@/api/base44Client';

/**
 * Upload a file and return { file_url }.
 * @param {File} file - Browser File object
 * @returns {Promise<{ file_url: string }>}
 */
export function uploadFile(file) {
  return base44.integrations.Core.UploadFile({ file });
}
