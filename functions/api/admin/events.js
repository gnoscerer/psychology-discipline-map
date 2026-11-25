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
  const conditions = [];
  const binds = [];

  const type = (params.get("type") || "").slice(0, 32);
  const userId = (params.get("userId") || "").slice(0, 64);
  const from = (params.get("from") || "").slice(0, 10);
  const to = (params.get("to") || "").slice(0, 10);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (type) { conditions.push("e.type = ?"); binds.push(type); }
  if (userId) { conditions.push("e.user_id = ?"); binds.push(userId); }
  if (datePattern.test(from)) { conditions.push("e.created_at >= ?"); binds.push(from + "T00:00:00.000Z"); }
  if (datePattern.test(to)) { conditions.push("e.created_at <= ?"); binds.push(to + "T23:59:59.999Z"); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(params.get("offset")) || 0, 0);

  try {
    const total = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM events e ${where}`
    ).bind(...binds).first();

    const rows = await env.DB.prepare(
      `SELECT e.id, e.user_id, e.type, e.path, e.branch_id, e.category, e.search_term,
              e.meta, e.created_at, COALESCE(u.display_name, '匿名访客') AS display_name
       FROM events e LEFT JOIN users u ON u.id = e.user_id
       ${where}
       ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all();

    return json({ total: total ? total.total : 0, rows: rows.results || [] });
  } catch (error) {
    return json({ error: "query_failed", detail: String(error && error.message || error) }, 500);
  }
}
