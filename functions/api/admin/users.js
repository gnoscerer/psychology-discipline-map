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

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(params.get("offset")) || 0, 0);

  try {
    const total = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first();
    const rows = await env.DB.prepare(
      `SELECT u.id, u.display_name, u.consent, u.created_at, u.last_seen_at,
              COUNT(e.id) AS event_count
       FROM users u LEFT JOIN events e ON e.user_id = u.id
       GROUP BY u.id
       ORDER BY u.last_seen_at DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    return json({ total: total ? total.total : 0, rows: rows.results || [] });
  } catch (error) {
    return json({ error: "query_failed", detail: String(error && error.message || error) }, 500);
  }
}
