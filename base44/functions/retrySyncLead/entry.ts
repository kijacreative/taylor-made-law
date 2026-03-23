import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and associates can retry syncs
    if (!['admin', 'senior_associate', 'junior_associate'].includes(user.user_type) && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { lead_id } = body;

    if (!lead_id) {
      return Response.json({ error: 'lead_id is required' }, { status: 400 });
    }

    // Fetch the lead
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    if (leads.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leads[0];

    // Reset sync status to pending and clear error
    await base44.entities.Lead.update(lead_id, {
      sync_status: 'pending',
      sync_error_message: null,
      last_sync_attempt_at: new Date().toISOString()
    });

    // Call the Lead Docket sync function (invoke another backend function)
    try {
      const syncRes = await base44.asServiceRole.functions.invoke('syncLeadToDocket', {
        lead_id: lead_id,
        lead_data: lead
      });

      if (syncRes.data?.success) {
        await base44.entities.Lead.update(lead_id, {
          sync_status: 'sent',
          lead_docket_id: syncRes.data.lead_docket_id,
          sync_error_message: null,
          last_sync_attempt_at: new Date().toISOString()
        });
        return Response.json({ success: true, lead_docket_id: syncRes.data.lead_docket_id });
      } else {
        const errorMessage = syncRes.data?.error || 'Unknown sync error';
        await base44.entities.Lead.update(lead_id, {
          sync_status: 'failed',
          sync_error_message: errorMessage,
          last_sync_attempt_at: new Date().toISOString()
        });
        return Response.json({ success: false, error: errorMessage }, { status: 500 });
      }
    } catch (syncError) {
      const errorMessage = syncError?.message || 'Sync function failed';
      await base44.entities.Lead.update(lead_id, {
        sync_status: 'failed',
        sync_error_message: errorMessage,
        last_sync_attempt_at: new Date().toISOString()
      });
      return Response.json({ success: false, error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});