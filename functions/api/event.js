const TYPES = new Set([
  "page_view", "branch_view", "search", "filter", "card_click",
  "pager_click", "engagement", "scroll", "consent"
]);

const CATEGORIES = new Set(["basic", "applied", "emerging", "hub"]);
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function clean(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    const text = await request.text();
    if (text.length > 8000) return json({ ok: false, error: "payload_too_large" }, 413);
    payload = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const userId = clean(payload.userId, 64);
  const sessionId = clean(payload.sessionId, 64);
  const type = clean(payload.type, 32);

  if (!ID_PATTERN.test(userId) || !ID_PATTERN.test(sessionId) || !TYPES.has(type)) {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  const branchId = clean(payload.branchId, 80);
  const category = clean(payload.category, 20);
  const now = new Date().toISOString();

  try {
    const user = await env.DB.prepare("SELECT consent FROM users WHERE id = ?").bind(userId).first();
    if (!user || user.consent !== 1) {
      return json({ ok: false, error: "no_consent" }, 202);
    }

    await env.DB.prepare(
      "INSERT OR IGNORE INTO sessions (id, user_id, started_at) VALUES (?, ?, ?)"
    ).bind(sessionId, userId, now).run();

    await env.DB.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").bind(now, userId).run();

    let meta = "";
    if (payload.meta && typeof payload.meta === "object" && !Array.isArray(payload.meta)) {
      meta = JSON.stringify(payload.meta).slice(0, 1200);
    }

    await env.DB.prepare(
      `INSERT INTO events
       (user_id, session_id, type, path, branch_id, category, search_term, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      sessionId,
      type,
      clean(payload.path, 200),
      ID_PATTERN.test(branchId) || /^[a-z0-9-]{1,80}$/.test(branchId) ? branchId : "",
      CATEGORIES.has(category) ? category : "",
      clean(payload.searchTerm, 80),
      meta,
      now
    ).run();

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: "storage_failed", detail: String(error && error.message || error) }, 500);
  }
}
