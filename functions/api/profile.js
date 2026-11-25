const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function userIdOf(url) {
  const id = (url.searchParams.get("userId") || "").slice(0, 64);
  return ID_PATTERN.test(id) ? id : "";
}

export async function onRequestGet({ request, env }) {
  const userId = userIdOf(new URL(request.url));
  if (!userId) return json({ error: "invalid_user" }, 400);

  try {
    const user = await env.DB.prepare(
      "SELECT id, display_name, email, consent, created_at, last_seen_at FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) return json({ profile: null, events: [] });

    const result = await env.DB.prepare(
      `SELECT id, type, path, branch_id, category, search_term, created_at
       FROM events WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`
    ).bind(userId).all();

    return json({
      profile: {
        id: user.id,
        displayName: user.display_name || "",
        email: user.email || "",
        consent: user.consent === 1,
        createdAt: user.created_at,
        lastSeenAt: user.last_seen_at
      },
      events: result.results || []
    });
  } catch (error) {
    return json({ error: "read_failed", detail: String(error && error.message || error) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const userId = String(payload.userId || "").slice(0, 64);
  const displayName = String(payload.displayName || "").trim().slice(0, 40);
  const email = String(payload.email || "").trim().slice(0, 120);
  const consent = payload.consent === true ? 1 : 0;

  if (!ID_PATTERN.test(userId)) return json({ error: "invalid_user" }, 400);
  if (email && !EMAIL_PATTERN.test(email)) return json({ error: "invalid_email" }, 400);

  const now = new Date().toISOString();
  try {
    const existing = await env.DB.prepare("SELECT consent FROM users WHERE id = ?").bind(userId).first();

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO users (id, display_name, email, consent, created_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(userId, displayName, email, consent, now, now).run();
    } else {
      await env.DB.prepare(
        "UPDATE users SET display_name = ?, email = ?, consent = ?, last_seen_at = ? WHERE id = ?"
      ).bind(displayName, email, consent, now, userId).run();
    }

    if (!existing || existing.consent !== consent) {
      await env.DB.prepare(
        "INSERT INTO consent_log (user_id, consent, created_at) VALUES (?, ?, ?)"
      ).bind(userId, consent, now).run();
    }

    return json({ ok: true, consent: consent === 1 });
  } catch (error) {
    return json({ error: "save_failed", detail: String(error && error.message || error) }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  const userId = userIdOf(new URL(request.url));
  if (!userId) return json({ error: "invalid_user" }, 400);

  try {
    await env.DB.prepare("DELETE FROM events WHERE user_id = ?").bind(userId).run();
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
    await env.DB.prepare("DELETE FROM consent_log WHERE user_id = ?").bind(userId).run();
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    return json({ ok: true });
  } catch (error) {
    return json({ error: "delete_failed", detail: String(error && error.message || error) }, 500);
  }
}
