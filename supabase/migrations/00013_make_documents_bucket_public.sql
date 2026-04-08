-- 00013_make_documents_bucket_public.sql
-- Make the documents bucket public so circle chat file previews load
-- without requiring auth headers (images render inline in chat).

UPDATE storage.buckets SET public = true WHERE id = 'documents';
