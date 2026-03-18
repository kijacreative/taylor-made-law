import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    const circleId = formData.get('circle_id');
    const messageId = formData.get('message_id') || null;

    if (!file || !circleId) {
      return Response.json({ error: 'Missing file or circle_id' }, { status: 400 });
    }

    // Verify user is an active member of this circle
    const memberships = await base44.asServiceRole.entities.LegalCircleMember.filter({
      circle_id: circleId,
      user_id: user.id,
      status: 'active'
    });

    if (!memberships || memberships.length === 0) {
      return Response.json({ error: 'Not a member of this circle' }, { status: 403 });
    }

    // Upload the file to storage
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const fileUrl = uploadResult.file_url;

    if (!fileUrl) {
      return Response.json({ error: 'File upload failed' }, { status: 500 });
    }

    // Create CircleFile record
    const circleFile = await base44.asServiceRole.entities.CircleFile.create({
      circle_id: circleId,
      uploaded_by_user_id: user.id,
      uploaded_by_name: user.full_name || user.email,
      uploaded_by_email: user.email,
      message_id: messageId,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size || 0,
      file_url: fileUrl,
      is_deleted: false
    });

    // Audit log (best effort)
    base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'CircleFile',
      entity_id: circleFile.id,
      action: 'circle_file_uploaded',
      actor_email: user.email,
      notes: `File "${file.name}" uploaded to circle ${circleId}`
    }).catch(() => {});

    return Response.json({ 
      success: true, 
      file: circleFile,
      file_url: fileUrl
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});