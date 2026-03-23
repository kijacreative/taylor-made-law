import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { document_id, signers, deadline_days = 7 } = await req.json();

        if (!document_id || !signers || !Array.isArray(signers)) {
            return Response.json({ error: 'Missing required fields: document_id, signers' }, { status: 400 });
        }

        // Get document
        const document = await base44.entities.CircleDocument.get(document_id);
        if (!document) {
            return Response.json({ error: 'Document not found' }, { status: 404 });
        }

        if (!document.requires_signature) {
            return Response.json({ error: 'Document does not require signature' }, { status: 400 });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + deadline_days);

        // Create signature requests for each signer
        const signatureRequests = [];
        for (const signerEmail of signers) {
            // Find user by email
            const users = await base44.asServiceRole.entities.User.filter({ email: signerEmail });
            if (users.length === 0) {
                return Response.json({ error: `User not found: ${signerEmail}` }, { status: 404 });
            }

            const signerUser = users[0];

            const signatureRequest = await base44.asServiceRole.entities.DocumentSignature.create({
                document_id,
                signer_user_id: signerUser.id,
                signer_email: signerUser.email,
                signer_name: signerUser.full_name,
                requested_by_user_id: user.id,
                requested_by_name: user.full_name,
                status: 'pending',
                expires_at: expiresAt.toISOString()
            });

            signatureRequests.push(signatureRequest);

            // TODO: Send email notification to signer
        }

        // Update document signature status
        await base44.entities.CircleDocument.update(document_id, {
            signature_status: 'pending',
            signature_requested_by: user.id,
            signature_requested_at: new Date().toISOString(),
            signature_deadline: expiresAt.toISOString()
        });

        return Response.json({ 
            success: true, 
            signature_requests: signatureRequests 
        });
    } catch (error) {
        console.error('Error requesting signatures:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});