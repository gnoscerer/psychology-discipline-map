(function () {
  "use strict";

  var TOKEN_KEY = "psych_admin_token";
  var token = sessionStorage.getItem(TOKEN_KEY) || "";
  var currentEvents = [];
  var loginSection = document.getElementById("login-section");
  var dashboardSection = document.getElementById("dashboard-section");
  var loginMessage = document.getElementById("login-message");
  var dashMessage = document.getElementById("dash-message");
  var filterMessage = document.getElementById("filter-message");

  function api(path) {
    return fetch(path, { headers: { "x-admin-token": token } });
  }

  function message(node, text, isError) {
    node.textContent = text;
    node.classList.toggle("error", Boolean(isError));
  }

  function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
  }

  function showLogin(text) {
    dashboardSection.hidden = true;
    loginSection.hidden = false;
    message(loginMessage, text || "", Boolean(text));
  }

  function addCell(row, value, label, asHeader) {
    var cell = document.createElement(asHeader ? "th" : "td");
    if (asHeader) cell.scope = "row";
    else cell.setAttribute("data-label", label);
    cell.textContent = value || "—";
    row.appendChild(cell);
  }

  function renderRows(target, rows, fields) {
    target.textContent = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = fields.length;
      td.textContent = "暂无记录";
      tr.appendChild(td);
      target.appendChild(tr);
      return;
    }
    rows.forEach(function (row, index) {
      var tr = document.createElement("tr");
      fields.forEach(function (field, fieldIndex) {
        addCell(tr, row[field.key], field.label, fieldIndex === 0);
      });
      target.appendChild(tr);
    });
  }

  function renderBars(id, rows) {
    var container = document.getElementById(id);
    container.textContent = "";
    if (!rows.length) {
      var empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "暂无数据";
      container.appendChild(empty);
      return;
    }
    var max = Math.max.apply(null, rows.map(function (row) { return Number(row.count) || 0; }).concat([1]));
    rows.forEach(function (row) {
      var line = document.createElement("div");
      line.className = "bar-row";
      var label = document.createElement("div");
      label.className = "bar-label";
      var name = document.createElement("span");
      name.textContent = row.name || "（空）";
      var count = document.createElement("span");
      count.textContent = row.count;
      label.appendChild(name);
      label.appendChild(count);
      var track = document.createElement("div");
      track.className = "bar-track";
      var fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = ((Number(row.count) / max) * 100) + "%";
      track.appendChild(fill);
      line.appendChild(label);
      line.appendChild(track);
      container.appendChild(line);
    });
  }

  function renderSummary(data) {
    document.getElementById("stat-users").textContent = data.users.total;
    document.getElementById("stat-consented").textContent = data.users.consented;
    document.getElementById("stat-events").textContent = data.events.total;
    document.getElementById("stat-today").textContent = data.events.today;
    document.getElementById("stat-week").textContent = data.events.week;
    renderBars("bar-branches", data.topBranches);
    renderBars("bar-paths", data.topPaths);
    renderBars("bar-searches", data.topSearches);
    renderBars("bar-types", data.eventTypes);
    renderRows(document.getElementById("recent-body"), data.recent, [
      { key: "created_at", label: "时间" },
      { key: "type", label: "类型" },
      { key: "display_name", label: "访客" },
      { key: "path", label: "页面 / 分支" }
    ]);
  }

  async function loadSummary() {
    try {
      var response = await api("/api/admin/summary");
      if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        showLogin("令牌无效，请重新输入。");
        return;
      }
      if (!response.ok) throw new Error("HTTP " + response.status);
      renderSummary(await response.json());
      message(dashMessage, "数据已更新。");
      showDashboard();
    } catch (error) {
      message(dashMessage, "读取数据失败，请稍后重试。", true);
    }
  }

  async function loadEvents() {
    var params = new URLSearchParams();
    ["type", "from", "to", "limit"].forEach(function (id) {
      var value = document.getElementById("filter-" + id).value.trim();
      if (value) params.set(id, value);
    });
    try {
      var response = await api("/api/admin/events?" + params.toString());
      if (response.status === 401) { showLogin("会话已过期，请重新输入令牌。"); return; }
      if (!response.ok) throw new Error("HTTP " + response.status);
      var data = await response.json();
      currentEvents = data.rows;
      renderRows(document.getElementById("detail-body"), data.rows, [
        { key: "created_at", label: "时间" },
        { key: "type", label: "类型" },
        { key: "display_name", label: "访客" },
        { key: "path", label: "页面" },
        { key: "search_term", label: "搜索词 / 分支" }
      ]);
      message(filterMessage, "共 " + data.total + " 条，当前显示 " + data.rows.length + " 条。");
    } catch (error) {
      message(filterMessage, "查询失败，请稍后重试。", true);
    }
  }

  function exportCsv() {
    if (!currentEvents.length) {
      message(filterMessage, "当前没有可导出的记录。", true);
      return;
    }
    var escape = function (value) {
      return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
    };
    var lines = ["时间,类型,访客,页面,分支,搜索词"];
    currentEvents.forEach(function (row) {
      lines.push([
        row.created_at, row.type, row.display_name, row.path, row.branch_id, row.search_term
      ].map(escape).join(","));
    });
    var blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "行为事件.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (token) loadSummary(); else showLogin();

    document.getElementById("login-button").addEventListener("click", async function () {
      token = document.getElementById("admin-token").value.trim();
      if (!token) { message(loginMessage, "请输入令牌。", true); return; }
      var response = await fetch("/api/admin/summary", { headers: { "x-admin-token": token } });
      if (!response.ok) {
        token = "";
        message(loginMessage, "令牌无效或后台未配置，请检查后重试。", true);
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, token);
      renderSummary(await response.json());
      showDashboard();
      loadEvents();
    });

    document.getElementById("refresh-button").addEventListener("click", function () {
      loadSummary();
      loadEvents();
    });
    document.getElementById("logout-button").addEventListener("click", function () {
      sessionStorage.removeItem(TOKEN_KEY);
      token = "";
      showLogin();
    });
    document.getElementById("event-filter").addEventListener("submit", function (event) {
      event.preventDefault();
      loadEvents();
    });
    document.getElementById("export-csv").addEventListener("click", exportCsv);
  });
})();
