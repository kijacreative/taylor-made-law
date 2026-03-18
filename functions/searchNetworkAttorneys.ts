import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return Response.json({ results: [] });
    }

    const q = query.trim().toLowerCase();

    // Get all approved LawyerProfiles
    const profiles = await base44.asServiceRole.entities.LawyerProfile.filter({ status: 'approved' });

    // Get all users to match names
    let users = [];
    try {
      users = await base44.asServiceRole.entities.User.list();
    } catch (_) {}

    const userMap = {};
    for (const u of users) {
      userMap[u.id] = u;
      if (u.email) userMap[u.email] = u;
    }

    const results = profiles
      .map(profile => {
        const u = userMap[profile.user_id] || userMap[profile.created_by] || {};
        return {
          email: u.email || profile.created_by || '',
          name: u.full_name || profile.full_name || '',
          firm_name: profile.firm_name || '',
          practice_areas: profile.practice_areas || [],
          states_licensed: profile.states_licensed || [],
          profile_id: profile.id,
          user_id: profile.user_id || u.id || ''
        };
      })
      .filter(r => r.email && r.email !== user.email)
      .filter(r =>
        r.email.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.firm_name.toLowerCase().includes(q)
      )
      .slice(0, 10);

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});