import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { signature_id, signature_method = 'electronic_click', signature_data = null } = await req.json();

        if (!signature_id) {
            return Response.json({ error: 'Missing signature_id' }, { status: 400 });
        }

        // Get signature request
        const signature = await base44.entities.DocumentSignature.get(signature_id);
        if (!signature) {
            return Response.json({ error: 'Signature request not found' }, { status: 404 });
        }

        // Verify user is the signer
        if (signature.signer_user_id !== user.id) {
            return Response.json({ error: 'Unauthorized: You are not the designated signer' }, { status: 403 });
        }

        // Check if already signed or expired
        if (signature.status === 'signed') {
            return Response.json({ error: 'Document already signed' }, { status: 400 });
        }

        if (signature.status === 'expired') {
            return Response.json({ error: 'Signature request has expired' }, { status: 400 });
        }

        const now = new Date();
        if (signature.expires_at && new Date(signature.expires_at) < now) {
            await base44.asServiceRole.entities.DocumentSignature.update(signature_id, { status: 'expired' });
            return Response.json({ error: 'Signature request has expired' }, { status: 400 });
        }

        // Get document
        const document = await base44.entities.CircleDocument.get(signature.document_id);
        if (!document) {
            return Response.json({ error: 'Document not found' }, { status: 404 });
        }

        // Sign the document
        await base44.entities.DocumentSignature.update(signature_id, {
            status: 'signed',
            signed_at: now.toISOString(),
            signature_ip: req.headers.get('x-forwarded-for') || 'unknown',
            signature_method,
            signature_data: signature_data || user.full_name
        });

        // Check if all signatures are complete
        const allSignatures = await base44.asServiceRole.entities.DocumentSignature.filter({
            document_id: signature.document_id
        });

        const allSigned = allSignatures.every(s => s.status === 'signed');
        const anyDeclined = allSignatures.some(s => s.status === 'declined');
        const anyPending = allSignatures.some(s => s.status === 'pending');

        let newStatus = 'partially_signed';
        if (allSigned) {
            newStatus = 'fully_signed';
        } else if (anyDeclined) {
            newStatus = 'declined';
        }

        // Update document signature status
        await base44.entities.CircleDocument.update(signature.document_id, {
            signature_status: newStatus,
            status: newStatus === 'fully_signed' ? 'final' : document.status
        });

        // TODO: Send notification to document owner when signed

        return Response.json({ 
            success: true, 
            document_status: newStatus 
        });
    } catch (error) {
        console.error('Error signing document:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});