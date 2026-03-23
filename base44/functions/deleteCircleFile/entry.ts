import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_id } = await req.json();
    if (!file_id) return Response.json({ error: 'Missing file_id' }, { status: 400 });

    // Fetch the file
    const files = await base44.asServiceRole.entities.CircleFile.filter({ id: file_id });
    if (!files || files.length === 0) {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }
    const circleFile = files[0];

    // Verify user is a member of the circle
    const memberships = await base44.asServiceRole.entities.LegalCircleMember.filter({
      circle_id: circleFile.circle_id,
      user_id: user.id,
      status: 'active'
    });
    if (!memberships || memberships.length === 0) {
      return Response.json({ error: 'Not a member of this circle' }, { status: 403 });
    }

    // Only uploader or circle admin can delete
    const isAdmin = user.role === 'admin' || memberships[0]?.role === 'admin' || memberships[0]?.role === 'moderator';
    const isUploader = circleFile.uploaded_by_user_id === user.id;
    if (!isAdmin && !isUploader) {
      return Response.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Soft delete
    await base44.asServiceRole.entities.CircleFile.update(file_id, {
      is_deleted: true,
      deleted_by: user.email
    });

    // Audit log
    base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'CircleFile',
      entity_id: file_id,
      action: 'circle_file_deleted',
      actor_email: user.email,
      notes: `File "${circleFile.file_name}" deleted from circle ${circleFile.circle_id}`
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});