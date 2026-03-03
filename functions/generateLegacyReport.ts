/**
 * generateLegacyReport — Admin-only.
 * Generates a CSV/JSON report of all lawyer users, their statuses,
 * invitation records, activation tokens, and potential duplicates by email.
 * Safe read-only operation — no data is modified.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();

    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all data in parallel
    const [allUsers, allTokens, allAuditLogs] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 500),
      base44.asServiceRole.entities.ActivationToken.list('-created_date', 1000),
      base44.asServiceRole.entities.AuditLog.list('-created_date', 500),
    ]);

    const lawyerUsers = allUsers.filter(u => u.role !== 'admin');

    // Group by normalized email to find duplicates
    const byEmail = {};
    for (const u of lawyerUsers) {
      const key = (u.email || '').toLowerCase().trim();
      if (!byEmail[key]) byEmail[key] = [];
      byEmail[key].push(u);
    }

    // Build report rows
    const rows = [];
    for (const [email, users] of Object.entries(byEmail)) {
      const isDuplicate = users.length > 1;
      for (const u of users) {
        const userTokens = allTokens.filter(t => t.user_email === email);
        const activeTokens = userTokens.filter(t => !t.used_at && new Date(t.expires_at) > new Date());
        const usedTokens = userTokens.filter(t => t.used_at);
        const userLogs = allAuditLogs.filter(l => l.entity_id === u.id || l.actor_email === email);

        rows.push({
          email: u.email,
          email_normalized: email,
          user_id: u.id,
          full_name: u.full_name || '',
          firm_name: u.firm_name || '',
          user_status: u.user_status || 'none',
          role: u.role || 'user',
          email_verified: u.email_verified ? 'Y' : 'N',
          password_set: u.password_set ? 'Y' : 'N',
          created_date: u.created_date ? new Date(u.created_date).toISOString().split('T')[0] : '',
          approved_at: u.approved_at ? new Date(u.approved_at).toISOString().split('T')[0] : '',
          approved_by: u.approved_by || '',
          disabled_at: u.disabled_at ? new Date(u.disabled_at).toISOString().split('T')[0] : '',
          applied_at: u.applied_at ? new Date(u.applied_at).toISOString().split('T')[0] : '',
          invited_by_admin: u.invited_by_admin || '',
          active_tokens: activeTokens.length,
          used_tokens: usedTokens.length,
          total_tokens: userTokens.length,
          audit_log_count: userLogs.length,
          is_duplicate_email: isDuplicate ? 'YES' : 'no',
          duplicate_count: users.length,
        });
      }
    }

    // Sort: duplicates first, then by email
    rows.sort((a, b) => {
      if (a.is_duplicate_email !== b.is_duplicate_email) return a.is_duplicate_email === 'YES' ? -1 : 1;
      return a.email_normalized.localeCompare(b.email_normalized);
    });

    // Build CSV
    const headers = Object.keys(rows[0] || {});
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = String(row[h] || '').replace(/"/g, '""');
          return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
        }).join(',')
      )
    ];
    const csv = csvLines.join('\n');

    // Summary stats
    const summary = {
      total_lawyer_users: lawyerUsers.length,
      by_status: {},
      duplicate_emails: Object.values(byEmail).filter(arr => arr.length > 1).length,
      total_tokens: allTokens.length,
      active_tokens: allTokens.filter(t => !t.used_at && new Date(t.expires_at) > new Date()).length,
      expired_unused_tokens: allTokens.filter(t => !t.used_at && new Date(t.expires_at) <= new Date()).length,
    };
    for (const u of lawyerUsers) {
      const s = u.user_status || 'none';
      summary.by_status[s] = (summary.by_status[s] || 0) + 1;
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'System',
      entity_id: 'report',
      action: 'reset_report_generated',
      actor_email: adminUser.email,
      actor_role: 'admin',
      notes: `Legacy report generated. ${lawyerUsers.length} users, ${summary.duplicate_emails} duplicate emails.`
    });

    return Response.json({
      success: true,
      summary,
      csv,
      rows,
      generated_at: new Date().toISOString(),
      generated_by: adminUser.email
    });

  } catch (error) {
    console.error('generateLegacyReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});