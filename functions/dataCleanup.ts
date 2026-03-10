/**
 * dataCleanup — Admin-only function for Phase 6 data cleanup.
 * 
 * Operations:
 * 1. Email Normalization: Ensure all users have email_normalized
 * 2. User Deduplication: Merge duplicate users by normalized email
 * 3. Activation Token Cleanup: Invalidate tokens older than 14 days
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const summary = {
      emails_normalized: 0,
      duplicates_merged: 0,
      tokens_invalidated: 0,
      errors: []
    };

    // ─────────────────────────────────────────────────────────────────
    // 1. EMAIL NORMALIZATION
    // ─────────────────────────────────────────────────────────────────
    try {
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000);
      
      for (const u of allUsers) {
        if (!u.email_normalized) {
          const normalized = u.email?.toLowerCase().trim() || '';
          if (normalized) {
            await base44.asServiceRole.entities.User.update(u.id, {
              email_normalized: normalized
            });
            summary.emails_normalized++;
          }
        }
      }
    } catch (err) {
      summary.errors.push(`Email normalization failed: ${err.message}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. USER DEDUPLICATION
    // ─────────────────────────────────────────────────────────────────
    try {
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000);
      const emailMap = {};
      
      // Group users by normalized email
      for (const u of allUsers) {
        const normalized = u.email_normalized || u.email?.toLowerCase().trim() || '';
        if (normalized && u.id) {
          if (!emailMap[normalized]) {
            emailMap[normalized] = [];
          }
          emailMap[normalized].push(u);
        }
      }

      // Merge duplicates
      for (const [email, users] of Object.entries(emailMap)) {
        if (users.length > 1) {
          // Sort by: most complete profile (most fields filled), then oldest created
          users.sort((a, b) => {
            const scoreA = countFilledFields(a);
            const scoreB = countFilledFields(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(a.created_date) - new Date(b.created_date);
          });

          const primary = users[0];
          const duplicates = users.slice(1);

          for (const dup of duplicates) {
            // Merge entry_source
            let mergedSource = primary.entry_source || '';
            if (dup.entry_source && dup.entry_source !== mergedSource) {
              if (mergedSource && mergedSource !== 'both') {
                mergedSource = 'both';
              } else if (!mergedSource) {
                mergedSource = dup.entry_source;
              }
            }

            // Merge timestamps
            const mergedData = {
              entry_source: mergedSource,
              // Take earliest applied_at
              applied_at: (primary.applied_at && dup.applied_at) 
                ? (new Date(primary.applied_at) < new Date(dup.applied_at) ? primary.applied_at : dup.applied_at)
                : (primary.applied_at || dup.applied_at),
              // Take earliest invited_at
              invited_at: (primary.invited_at && dup.invited_at)
                ? (new Date(primary.invited_at) < new Date(dup.invited_at) ? primary.invited_at : dup.invited_at)
                : (primary.invited_at || dup.invited_at),
              // Preserve highest status (approved > pending > invited > cancelled > disabled)
              user_status: statusPrecedence(primary.user_status, dup.user_status),
            };

            // Merge profile fields (keep primary, fill gaps from duplicate)
            const profileFields = [
              'firm_name', 'phone', 'bar_number', 'bio', 'website',
              'office_address', 'states_licensed', 'practice_areas',
              'years_experience', 'profile_photo_url'
            ];
            for (const field of profileFields) {
              if (!primary[field] && dup[field]) {
                mergedData[field] = dup[field];
              }
            }

            // Mark primary as merged
            mergedData.admin_note = `[MERGED] ${new Date().toISOString()} - Duplicate of ${dup.id} (${dup.email})` + 
              (primary.admin_note ? `\n${primary.admin_note}` : '');

            // Update primary with merged data
            await base44.asServiceRole.entities.User.update(primary.id, mergedData);

            // Mark duplicate as merged/cancelled
            await base44.asServiceRole.entities.User.update(dup.id, {
              user_status: 'cancelled',
              admin_note: `[DUPLICATE MERGED] ${new Date().toISOString()} - Merged into ${primary.id} (${primary.email})`
            });

            // Log the merge
            await base44.asServiceRole.entities.AuditLog.create({
              entity_type: 'User',
              entity_id: primary.id,
              action: 'user_merge',
              actor_email: user.email,
              actor_role: user.role,
              notes: `Merged duplicate ${dup.id} (${dup.email}) into ${primary.id}`
            });

            summary.duplicates_merged++;
          }
        }
      }
    } catch (err) {
      summary.errors.push(`User deduplication failed: ${err.message}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. ACTIVATION TOKEN CLEANUP
    // ─────────────────────────────────────────────────────────────────
    try {
      const allTokens = await base44.asServiceRole.entities.ActivationToken.list('-created_date', 5000);
      const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      for (const token of allTokens) {
        // Invalidate old unused tokens
        if (!token.used_at && token.created_date < cutoffDate) {
          await base44.asServiceRole.entities.ActivationToken.update(token.id, {
            used_at: new Date().toISOString(),
            invalidated_reason: 'cleanup_expired_14days'
          });
          summary.tokens_invalidated++;
        }
      }
    } catch (err) {
      summary.errors.push(`Token cleanup failed: ${err.message}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // AUDIT LOG
    // ─────────────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'System',
      entity_id: 'data_cleanup',
      action: 'data_cleanup_executed',
      actor_email: user.email,
      actor_role: user.role,
      notes: JSON.stringify(summary)
    });

    return Response.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('dataCleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Count how many fields are filled in a user record.
 * Used to determine which duplicate is most complete.
 */
function countFilledFields(user) {
  const fields = [
    'full_name', 'email', 'email_verified', 'password_set',
    'firm_name', 'phone', 'bar_number', 'bio', 'website',
    'office_address', 'states_licensed', 'practice_areas',
    'years_experience', 'profile_photo_url', 'profile_completed_at',
    'referral_agreement_accepted', 'terms_accepted_at'
  ];
  
  let count = 0;
  for (const field of fields) {
    const val = user[field];
    if (val !== null && val !== undefined && val !== '' && val !== false) {
      count++;
    }
  }
  return count;
}

/**
 * Determine status precedence: approved > pending > invited > cancelled > disabled
 * Higher status takes priority.
 */
function statusPrecedence(status1, status2) {
  const precedence = {
    approved: 5,
    pending: 4,
    invited: 3,
    cancelled: 2,
    disabled: 1
  };
  
  const s1 = precedence[status1] || 0;
  const s2 = precedence[status2] || 0;
  
  return s1 >= s2 ? status1 : status2;
}