(function () {
  "use strict";

  var USER_KEY = "psy_user_id";
  var userId = "";
  var sessionId = randomId();

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function getUserId() {
    if (!userId) {
      userId = localStorage.getItem(USER_KEY) || "";
      if (!userId) {
        userId = randomId();
        localStorage.setItem(USER_KEY, userId);
      }
    }
    return userId;
  }

  function send(type, extra) {
    var payload = Object.assign({
      userId: getUserId(),
      sessionId: sessionId,
      type: type,
      path: location.pathname
    }, extra || {});
    fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  var path = location.pathname;
  var file = path.split("/").pop().replace(/\.html$/, "");
  var cat = document.body.getAttribute("data-cat") || "";
  send("page_view", { category: cat === "hub" ? "hub" : cat });
  if (cat && cat !== "hub") {
    send("branch_view", { branchId: file, category: cat });
  }

  var input = document.getElementById("q");
  if (input) {
    var timer = null;
    var last = "";
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var value = input.value.trim();
        if (value && value !== last) {
          last = value;
          send("search", { searchTerm: value.slice(0, 80) });
        }
      }, 500);
    });
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var filter = target.closest("[data-filter]");
    if (filter) send("filter", { meta: { category: filter.getAttribute("data-filter") } });
    var card = target.closest("a.card-link");
    if (card) {
      var href = card.getAttribute("href") || "";
      send("card_click", { branchId: href.replace(/\.html.*$/, ""), meta: { target: href } });
    }
    var pager = target.closest(".pager a");
    if (pager) {
      send("pager_click", { branchId: (pager.getAttribute("href") || "").replace(/\.html.*$/, "") });
    }
  });

  var thresholds = [25, 50, 75, 100];
  var reached = {};
  window.addEventListener("scroll", function () {
    var doc = document.documentElement;
    var span = doc.scrollHeight - window.innerHeight;
    if (span <= 0) return;
    var percent = Math.round((window.scrollY / span) * 100);
    thresholds.forEach(function (t) {
      if (percent >= t && !reached[t]) {
        reached[t] = true;
        send("scroll", { meta: { depth: t } });
      }
    });
  }, { passive: true });

  var started = Date.now();
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      var seconds = Math.round((Date.now() - started) / 1000);
      if (seconds >= 3) send("engagement", { meta: { seconds: seconds } });
    }
    started = Date.now();
  });
})();
