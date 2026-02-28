import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Teaser-only fields returned to pending lawyers — NO sensitive data
const TEASER_FIELDS = ['id', 'title', 'state', 'practice_area', 'status', 'is_trending', 'published_at'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admins get full access via their own UI — redirect them away
    if (user.role === 'admin') {
      return Response.json({ error: 'Use admin portal for case management.' }, { status: 403 });
    }

    // Check approval: prefer user_status (new identity system), fall back to LawyerProfile (legacy)
    const userRecord = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const userStatus = userRecord[0]?.user_status || null;

    let isApproved = userStatus === 'approved';

    // Legacy fallback: if no user_status field, check LawyerProfile
    if (!userStatus) {
      const profiles = await base44.entities.LawyerProfile.filter({ user_id: user.id });
      const lawyerProfile = profiles[0] || null;
      isApproved = lawyerProfile?.status === 'approved';
    }

    // Fetch all published cases
    const allCases = await base44.entities.Case.filter({ status: 'published' });

    // Compute marketplace stats (always safe — no sensitive data)
    const byState = {};
    const byPracticeArea = {};
    for (const c of allCases) {
      if (c.state) byState[c.state] = (byState[c.state] || 0) + 1;
      if (c.practice_area) byPracticeArea[c.practice_area] = (byPracticeArea[c.practice_area] || 0) + 1;
    }

    const stats = {
      total: allCases.length,
      byState,
      byPracticeArea,
    };

    if (!isApproved) {
      // Return ONLY teaser data — strip all sensitive fields
      const teaserCases = allCases.map(c => {
        const teaser = {};
        for (const field of TEASER_FIELDS) {
          teaser[field] = c[field];
        }
        teaser._teaser = true; // signal to frontend
        return teaser;
      });

      return Response.json({
        approved: false,
        stats,
        cases: teaserCases,
      });
    }

    // Approved lawyer — full case data
    return Response.json({
      approved: true,
      stats,
      cases: allCases,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});