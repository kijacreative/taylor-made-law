import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { document_id, file, change_summary, upload_reason = 'revision' } = await req.json();

        if (!document_id || !file) {
            return Response.json({ error: 'Missing required fields: document_id, file' }, { status: 400 });
        }

        // Get current document
        const document = await base44.entities.CircleDocument.get(document_id);
        if (!document) {
            return Response.json({ error: 'Document not found' }, { status: 404 });
        }

        // Decode base64 file
        const fileData = file.data;
        const fileName = file.name;
        const fileType = file.type;
        
        // Convert base64 to array
        const base64Data = fileData.split(',')[1] || fileData;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const fileArray = Array.from(bytes);

        // Upload new file
        const uploadResponse = await base44.integrations.Core.UploadFile({ file: fileArray });
        const newFileUrl = uploadResponse.file_url;

        const newVersionNumber = (document.current_version_number || 1) + 1;

        // Create new version record
        await base44.asServiceRole.entities.DocumentVersion.create({
            document_id,
            version_number: newVersionNumber,
            file_url: newFileUrl,
            file_name: fileName,
            file_type: fileType,
            file_size: file.size,
            uploaded_by_user_id: user.id,
            uploaded_by_name: user.full_name,
            uploaded_by_email: user.email,
            change_summary: change_summary || `Version ${newVersionNumber} upload`,
            has_tracked_changes: false,
            is_current: true,
            upload_reason
        });

        // Mark previous version as not current
        const previousVersions = await base44.asServiceRole.entities.DocumentVersion.filter({
            document_id,
            version_number: { $lt: newVersionNumber }
        });

        for (const version of previousVersions) {
            await base44.asServiceRole.entities.DocumentVersion.update(version.id, { is_current: false });
        }

        // Update document with new current version
        await base44.entities.CircleDocument.update(document_id, {
            current_version_number: newVersionNumber,
            current_file_url: newFileUrl,
            current_file_name: fileName,
            uploaded_by_user_id: user.id,
            uploaded_by_name: user.full_name,
            uploaded_by_email: user.email,
            has_pending_changes: false
        });

        return Response.json({ 
            success: true, 
            version_number: newVersionNumber,
            file_url: newFileUrl 
        });
    } catch (error) {
        console.error('Error creating document version:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});