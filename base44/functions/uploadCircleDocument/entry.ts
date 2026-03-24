import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { nanoid } from 'npm:nanoid@5.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        const circleId = formData.get('circle_id');
        const title = formData.get('title');
        const description = formData.get('description') || '';
        const documentType = formData.get('document_type') || 'other';
        const caseId = formData.get('case_id') || null;
        const tags = formData.get('tags') ? JSON.parse(formData.get('tags')) : [];
        const isConfidential = formData.get('is_confidential') === 'true';
        const requiresSignature = formData.get('requires_signature') === 'true';

        if (!file || !circleId || !title) {
            return Response.json({ error: 'Missing required fields: file, circle_id, title' }, { status: 400 });
        }

        // Upload file
        const fileBuffer = await file.arrayBuffer();
        const fileBlob = new Blob([fileBuffer], { type: file.type || 'application/octet-stream' });
        
        const uploadResponse = await base44.integrations.Core.UploadFile({ file: fileBlob });
        const fileUrl = uploadResponse.file_url;

        // Create document record
        const documentData = {
            circle_id: circleId,
            title,
            description,
            document_type: documentType,
            current_version_number: 1,
            current_file_url: fileUrl,
            current_file_name: file.name,
            uploaded_by_user_id: user.id,
            uploaded_by_name: user.full_name,
            uploaded_by_email: user.email,
            case_id: caseId,
            tags,
            is_confidential,
            requires_signature: requiresSignature,
            signature_status: requiresSignature ? 'pending' : 'not_required',
            track_changes_enabled: false,
            has_pending_changes: false,
            status: 'draft'
        };

        const document = await base44.asServiceRole.entities.CircleDocument.create(documentData);

        // Create initial version record
        await base44.asServiceRole.entities.DocumentVersion.create({
            document_id: document.id,
            version_number: 1,
            file_url: fileUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            uploaded_by_user_id: user.id,
            uploaded_by_name: user.full_name,
            uploaded_by_email: user.email,
            change_summary: 'Initial upload',
            has_tracked_changes: false,
            is_current: true,
            upload_reason: 'initial_upload'
        });

        return Response.json({ 
            success: true, 
            document_id: document.id,
            document 
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});