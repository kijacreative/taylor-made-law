import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// FormData: file, thread_id, message_id
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    const threadId = formData.get('thread_id');
    const messageId = formData.get('message_id');

    if (!file || !threadId) return Response.json({ error: 'Missing file or thread_id' }, { status: 400 });

    // Verify participant
    const threads = await base44.asServiceRole.entities.DirectMessageThread.filter({ id: threadId });
    const thread = threads[0];
    if (!thread || !thread.participant_user_ids?.includes(user.id)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    if (!uploadResult?.file_url) return Response.json({ error: 'Upload failed' }, { status: 500 });

    const dmFile = await base44.asServiceRole.entities.DirectMessageFile.create({
      message_id: messageId || '',
      thread_id: threadId,
      uploaded_by_user_id: user.id,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size || 0,
      file_url: uploadResult.file_url,
      is_deleted: false
    });

    base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'DirectMessageFile',
      entity_id: dmFile.id,
      action: 'direct_message_file_uploaded',
      actor_email: user.email
    }).catch(() => {});

    return Response.json({ success: true, file: dmFile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});