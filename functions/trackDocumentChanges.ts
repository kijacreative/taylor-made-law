import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { document_id, changes_data } = await req.json();

        if (!document_id || !changes_data) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get current document
        const document = await base44.entities.CircleDocument.get(document_id);
        if (!document) {
            return Response.json({ error: 'Document not found' }, { status: 404 });
        }

        // Get current version
        const currentVersion = await base44.entities.DocumentVersion.filter({
            document_id,
            is_current: true
        }).then(versions => versions[0]);

        if (!currentVersion) {
            return Response.json({ error: 'Current version not found' }, { status: 404 });
        }

        // Update current version with tracked changes
        await base44.asServiceRole.entities.DocumentVersion.update(currentVersion.id, {
            has_tracked_changes: true,
            tracked_changes_data: JSON.stringify(changes_data)
        });

        // Update document status
        await base44.entities.CircleDocument.update(document_id, {
            track_changes_enabled: true,
            has_pending_changes: true
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error tracking changes:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});