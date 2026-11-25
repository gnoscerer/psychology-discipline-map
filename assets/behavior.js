(function () {
  "use strict";

  var CONSENT_KEY = "psy_consent";
  var USER_KEY = "psy_user_id";
  var NAME_KEY = "psy_display_name";
  var state = { consent: localStorage.getItem(CONSENT_KEY) || "", userId: "", sessionId: "" };

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function getUserId() {
    if (!state.userId) {
      state.userId = localStorage.getItem(USER_KEY) || "";
      if (!state.userId) {
        state.userId = randomId();
        localStorage.setItem(USER_KEY, state.userId);
      }
    }
    return state.userId;
  }

  function post(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(function () {});
  }

  function send(type, extra) {
    if (state.consent !== "granted") return;
    var payload = Object.assign({
      userId: getUserId(),
      sessionId: state.sessionId,
      type: type,
      path: location.pathname,
      createdAt: new Date().toISOString()
    }, extra || {});
    post("/api/event", payload);
  }

  function ensureBar() {
    var bar = document.getElementById("consent-bar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "consent-bar";
    bar.className = "consent-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "统计偏好设置");
    bar.innerHTML =
      '<div class="wrap consent-inner">' +
      '<p>本站仅在您同意后记录匿名浏览行为，用于改进内容与导航。不收集姓名、位置或跨站信息。</p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="btn btn-primary" id="consent-accept">接受统计</button>' +
      '<button type="button" class="btn btn-ghost" id="consent-deny">仅必要</button>' +
      '</div></div>';
    document.body.appendChild(bar);
    document.getElementById("consent-accept").addEventListener("click", function () {
      setConsent("granted");
    });
    document.getElementById("consent-deny").addEventListener("click", function () {
      setConsent("denied");
    });
    return bar;
  }

  function setConsent(value) {
    state.consent = value;
    localStorage.setItem(CONSENT_KEY, value);
    var bar = document.getElementById("consent-bar");
    if (bar) bar.hidden = true;
    if (value === "granted") {
      getUserId();
      post("/api/profile", {
        userId: state.userId,
        displayName: localStorage.getItem(NAME_KEY) || "",
        email: "",
        consent: true
      });
      send("consent", { meta: { choice: "granted" } });
      startTracking();
    }
    window.dispatchEvent(new CustomEvent("psych-consent", { detail: { consent: value } }));
  }

  function startTracking() {
    if (state.tracking) return;
    state.tracking = true;
    var path = location.pathname;
    var file = path.split("/").pop().replace(/\.html$/, "");
    var cat = document.body.getAttribute("data-cat") || "";
    send("page_view", { path: path, category: cat === "hub" ? "hub" : cat });
    if (cat && cat !== "hub") {
      send("branch_view", { branchId: file, category: cat, path: path });
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
            send("search", { searchTerm: value.slice(0, 80), path: path });
          }
        }, 500);
      });
    }

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var filter = target.closest("[data-filter]");
      if (filter) {
        send("filter", { meta: { category: filter.getAttribute("data-filter") }, path: path });
      }
      var card = target.closest("a.card-link");
      if (card) {
        var href = card.getAttribute("href") || "";
        send("card_click", {
          branchId: href.replace(/\.html.*$/, ""),
          path: path,
          meta: { target: href }
        });
      }
      var pager = target.closest(".pager a");
      if (pager) {
        send("pager_click", {
          branchId: (pager.getAttribute("href") || "").replace(/\.html.*$/, ""),
          path: path
        });
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
          send("scroll", { meta: { depth: t }, path: path });
        }
      });
    }, { passive: true });

    var started = Date.now();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        var seconds = Math.round((Date.now() - started) / 1000);
        if (seconds >= 3) send("engagement", { meta: { seconds: seconds }, path: path });
        started = Date.now();
      } else {
        started = Date.now();
      }
    });
  }

  window.PsychBehavior = {
    getUserId: getUserId,
    getConsent: function () { return state.consent; },
    setConsent: setConsent,
    send: send,
    displayNameKey: NAME_KEY
  };

  state.sessionId = randomId();
  if (!state.consent) {
    ensureBar();
  } else if (state.consent === "granted") {
    startTracking();
  }
})();
