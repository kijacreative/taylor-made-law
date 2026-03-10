/**
 * retryLeadDocketSync — Admin-only.
 * Retries Lead Docket sync for a lead that previously failed or is still pending.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LEAD_DOCKET_URL = Deno.env.get('LEAD_DOCKET_WEBHOOK_URL') || 'https://taylormadelaw.leaddocket.com/opportunities/form/1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { lead_id } = await req.json();
    if (!lead_id) return Response.json({ error: 'lead_id is required' }, { status: 400 });

    const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id });
    const lead = leads[0] || null;
    if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

    // Mark as retrying
    await base44.asServiceRole.entities.Lead.update(lead_id, {
      sync_status: 'retrying',
      last_sync_attempt_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Lead',
      entity_id: lead_id,
      action: 'lead_sync_retried',
      actor_email: user.email,
      actor_role: 'admin',
      notes: `Admin ${user.email} manually triggered Lead Docket sync retry`,
    });

    // Retry the sync
    let syncStatus = 'failed';
    let syncError = null;
    let leadDocketId = null;

    try {
      const ldRes = await fetch(LEAD_DOCKET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          state: lead.state,
          practice_area: lead.practice_area,
          description: lead.description,
          urgency: lead.urgency,
        }),
      });

      if (ldRes.ok) {
        syncStatus = 'sent';
        try {
          const ldBody = await ldRes.text();
          const ldData = ldBody ? JSON.parse(ldBody) : {};
          leadDocketId = ldData?.id || ldData?.lead_id || ldData?.opportunity_id || null;
        } catch {}
      } else {
        const errText = await ldRes.text().catch(() => '');
        syncError = `HTTP ${ldRes.status}: ${ldRes.statusText}${errText ? ' — ' + errText.slice(0, 200) : ''}`;
      }
    } catch (ldErr) {
      syncError = ldErr.message;
    }

    // Update lead with result
    const syncUpdate = {
      sync_status: syncStatus,
      last_sync_attempt_at: new Date().toISOString(),
    };
    if (leadDocketId) syncUpdate.lead_docket_id = leadDocketId;
    if (syncError) syncUpdate.sync_error_message = syncError;

    await base44.asServiceRole.entities.Lead.update(lead_id, syncUpdate);

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Lead',
      entity_id: lead_id,
      action: syncStatus === 'sent' ? 'lead_sent_to_lead_docket' : 'lead_sync_failed',
      actor_email: user.email,
      actor_role: 'admin',
      notes: syncStatus === 'sent'
        ? `Retry successful. Lead Docket external ID: ${leadDocketId || 'not returned'}`
        : `Retry failed: ${syncError}`,
    });

    return Response.json({
      success: true,
      sync_status: syncStatus,
      lead_docket_id: leadDocketId,
    });

  } catch (error) {
    console.error('retryLeadDocketSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});