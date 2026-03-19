import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { document_id } = await req.json();

        if (!document_id) {
            return Response.json({ error: 'Missing document_id' }, { status: 400 });
        }

        // Get all versions for this document
        const versions = await base44.entities.DocumentVersion.filter(
            { document_id },
            '-version_number'
        );

        // Get document details
        const document = await base44.entities.CircleDocument.get(document_id);

        // Get signature requests
        const signatures = await base44.entities.DocumentSignature.filter({ document_id });

        return Response.json({
            document,
            versions,
            signatures,
            version_count: versions.length
        });
    } catch (error) {
        console.error('Error getting document history:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});