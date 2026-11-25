function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function authorized(request, env) {
  const token = request.headers.get("x-admin-token") || "";
  return Boolean(env.ADMIN_TOKEN) && token === env.ADMIN_TOKEN;
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);

  try {
    const [users, events, topBranches, topPaths, topSearches, types, daily, recent] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN consent = 1 THEN 1 ELSE 0 END), 0) AS consented FROM users"
      ).first(),
      env.DB.prepare(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN created_at >= datetime('now','start of day') THEN 1 ELSE 0 END), 0) AS today,
                COALESCE(SUM(CASE WHEN created_at >= datetime('now','-7 days') THEN 1 ELSE 0 END), 0) AS week
         FROM events`
      ).first(),
      env.DB.prepare(
        `SELECT branch_id AS name, COUNT(*) AS count FROM events
         WHERE type = 'branch_view' AND branch_id != ''
         GROUP BY branch_id ORDER BY count DESC LIMIT 10`
      ).all(),
      env.DB.prepare(
        `SELECT path AS name, COUNT(*) AS count FROM events
         WHERE path != '' GROUP BY path ORDER BY count DESC LIMIT 10`
      ).all(),
      env.DB.prepare(
        `SELECT search_term AS name, COUNT(*) AS count FROM events
         WHERE type = 'search' AND search_term != ''
         GROUP BY search_term ORDER BY count DESC LIMIT 10`
      ).all(),
      env.DB.prepare(
        "SELECT type AS name, COUNT(*) AS count FROM events GROUP BY type ORDER BY count DESC"
      ).all(),
      env.DB.prepare(
        `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count FROM events
         WHERE created_at >= date('now','-13 days')
         GROUP BY day ORDER BY day ASC`
      ).all(),
      env.DB.prepare(
        `SELECT e.id, e.type, e.path, e.branch_id, e.search_term, e.created_at,
                COALESCE(u.display_name, '匿名访客') AS display_name
         FROM events e LEFT JOIN users u ON u.id = e.user_id
         ORDER BY e.created_at DESC LIMIT 20`
      ).all()
    ]);

    return json({
      users: users || { total: 0, consented: 0 },
      events: events || { total: 0, today: 0, week: 0 },
      topBranches: topBranches.results || [],
      topPaths: topPaths.results || [],
      topSearches: topSearches.results || [],
      eventTypes: types.results || [],
      daily: daily.results || [],
      recent: recent.results || []
    });
  } catch (error) {
    return json({ error: "summary_failed", detail: String(error && error.message || error) }, 500);
  }
}
