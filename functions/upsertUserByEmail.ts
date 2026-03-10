/**
 * ============================================================
 * upsertUserByEmail — Shared Identity Service
 * ============================================================
 * THE single source of truth for creating/updating attorney identities.
 * All entry points (invite, apply, approve, resend) MUST use this.
 *
 * STATUS PRECEDENCE (higher rank always wins, never downgrade):
 *   approved(3) > pending(2) > invited(1)
 *   disabled / cancelled → BLOCKED. Require admin reinstatement.
 *
 * ENTRY SOURCE TRACKING:
 *   invite, apply, approval, admin_create → merged to 'both' when mixed
 *
 * INPUT:
 *   email            (required) — raw email, will be normalized internally
 *   requested_status — invited | pending | approved   (default: invited)
 *   entry_source     — invite | apply | both | admin_create  (default: invite)
 *   profile          — object of User entity fields to merge
 *   actor_email      — who triggered this (for audit)
 *   actor_role       — role of actor (for audit)
 *   create_if_missing — boolean, default false
 *                        true  = call inviteUser to create User record if missing
 *                                (requires admin auth context in calling function)
 *                        false = update only, return action:'not_found' if absent
 *
 * OUTPUT:
 *   { success, action, status_changed, blocked, user }
 *   action: created | updated | status_upgraded | not_found | blocked | create_failed
 * ============================================================
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Status rank — higher = more privileged
const STATUS_RANK = { invited: 1, pending: 2, approved: 3 };
const BLOCKED_STATUSES = new Set(['disabled', 'cancelled']);

function resolveStatus(current, requested) {
  const c = (current || '').toLowerCase();
  const r = (requested || 'invited').toLowerCase();
  if (BLOCKED_STATUSES.has(c)) {
    return { final: c, blocked: true, upgraded: false };
  }
  const currentRank = STATUS_RANK[c] ?? 0;
  const requestedRank = STATUS_RANK[r] ?? 0;
  if (requestedRank > currentRank) {
    return { final: r, blocked: false, upgraded: true };
  }
  return { final: c, blocked: false, upgraded: false };
}

function mergeEntrySource(current, incoming) {
  if (!current || current === incoming) return incoming;
  if (current === 'both' || incoming === 'both') return 'both';
  return 'both'; // two distinct known sources
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      email,
      requested_status = 'invited',
      entry_source = 'invite',
      profile = {},
      actor_email = 'system',
      actor_role = 'system',
      create_if_missing = false,
    } = body;

    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Find existing user by email OR email_normalized ────────────
    const [byEmail, byNormalized] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ email: normalizedEmail }),
      base44.asServiceRole.entities.User.filter({ email_normalized: normalizedEmail }),
    ]);

    // Deduplicate by id
    const seenIds = new Set();
    const candidates = [...byEmail, ...byNormalized].filter(u => {
      if (seenIds.has(u.id)) return false;
      seenIds.add(u.id);
      return true;
    });

    let existingUser = candidates[0] || null;

    // ── DUPLICATE MERGE: more than one record found ────────────────
    if (candidates.length > 1) {
      // Keep highest-ranked status user as primary
      candidates.sort((a, b) => {
        const ra = STATUS_RANK[a.user_status] ?? 0;
        const rb = STATUS_RANK[b.user_status] ?? 0;
        return rb - ra;
      });
      existingUser = candidates[0];

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: existingUser.id,
        action: 'duplicate_merged',
        actor_email,
        actor_role,
        notes: `Found ${candidates.length} user records for ${normalizedEmail}. Using id=${existingUser.id} (status=${existingUser.user_status}).`
      });
    }

    // ── User EXISTS: apply update + status precedence ──────────────
    if (existingUser) {
      const currentStatus = existingUser.user_status || 'invited';
      const { final: newStatus, blocked, upgraded } = resolveStatus(currentStatus, requested_status);

      if (blocked) {
        await base44.asServiceRole.entities.AuditLog.create({
          entity_type: 'User',
          entity_id: existingUser.id,
          action: 'status_blocked_due_to_disabled',
          actor_email,
          actor_role,
          notes: `Blocked: attempted to set status='${requested_status}' via '${entry_source}' but user is '${currentStatus}'.`
        });
        return Response.json({
          success: false,
          blocked: true,
          action: 'blocked',
          reason: `User is ${currentStatus}. Admin reinstatement required.`,
          user: existingUser
        });
      }

      // Build update payload
      const updates = {
        email_normalized: normalizedEmail,
        entry_source: mergeEntrySource(existingUser.entry_source, entry_source),
      };

      if (upgraded) {
        updates.user_status = newStatus;
      }

      // Track timestamps per source
      if (entry_source === 'apply' && !existingUser.applied_at) {
        updates.applied_at = new Date().toISOString();
      }
      if ((entry_source === 'invite' || entry_source === 'admin_create') && !existingUser.invited_at) {
        updates.invited_at = new Date().toISOString();
      }
      if ((entry_source === 'invite' || entry_source === 'admin_create') && profile.invited_by_admin && !existingUser.invited_by_admin) {
        updates.invited_by_admin = profile.invited_by_admin;
      }

      // Merge profile fields — skip reserved identity-tracking keys, don't overwrite with empty
      const RESERVED = new Set(['invited_by_admin']);
      for (const [key, val] of Object.entries(profile)) {
        if (RESERVED.has(key)) continue;
        if (val !== undefined && val !== null && val !== '') {
          updates[key] = val;
        }
      }

      await base44.asServiceRole.entities.User.update(existingUser.id, updates);
      existingUser = { ...existingUser, ...updates };

      const auditAction = upgraded ? 'status_upgraded' : 'user_upserted';
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'User',
        entity_id: existingUser.id,
        action: auditAction,
        actor_email,
        actor_role,
        notes: upgraded
          ? `Status upgraded: '${currentStatus}' → '${newStatus}' via '${entry_source}'.`
          : `User profile updated via '${entry_source}'. Status unchanged: '${currentStatus}'.`
      });

      return Response.json({
        success: true,
        action: upgraded ? 'status_upgraded' : 'updated',
        status_changed: upgraded,
        blocked: false,
        user: existingUser
      });
    }

    // ── User DOES NOT EXIST ────────────────────────────────────────
    if (!create_if_missing) {
      return Response.json({ success: true, action: 'not_found', user: null });
    }

    // Create via platform inviteUser — requires real admin auth in call chain
    try {
      await base44.users.inviteUser(normalizedEmail, 'user');
    } catch (e) {
      console.log('inviteUser attempt (may be expected):', e.message);
    }

    // Wait for platform to create the user entity record
    await new Promise(r => setTimeout(r, 1500));

    const newUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const newUser = newUsers[0] || null;

    if (!newUser) {
      return Response.json({
        error: 'Failed to create user record. Ensure caller has admin auth.',
        action: 'create_failed'
      }, { status: 500 });
    }

    // Initialize the new user record
    const initData = {
      email_normalized: normalizedEmail,
      user_status: requested_status,
      entry_source,
      email_verified: false,
      password_set: false,
    };

    if (entry_source === 'apply') {
      initData.applied_at = new Date().toISOString();
    }
    if (entry_source === 'invite' || entry_source === 'admin_create') {
      initData.invited_at = new Date().toISOString();
      if (profile.invited_by_admin) initData.invited_by_admin = profile.invited_by_admin;
    }

    // Merge profile fields
    for (const [key, val] of Object.entries(profile)) {
      if (val !== undefined && val !== null && val !== '') {
        initData[key] = val;
      }
    }

    await base44.asServiceRole.entities.User.update(newUser.id, initData);
    const finalUser = { ...newUser, ...initData };

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'User',
      entity_id: newUser.id,
      action: 'user_upserted',
      actor_email,
      actor_role,
      notes: `Created new User record for ${normalizedEmail} via '${entry_source}'. Status: '${requested_status}'.`
    });

    return Response.json({
      success: true,
      action: 'created',
      status_changed: false,
      blocked: false,
      user: finalUser
    });

  } catch (error) {
    console.error('upsertUserByEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});