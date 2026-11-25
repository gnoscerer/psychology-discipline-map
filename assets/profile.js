(function () {
  "use strict";

  var userId = "";
  var current = { profile: null, events: [] };
  var message = document.getElementById("profile-message");
  var form = document.getElementById("profile-form");
  var nameInput = document.getElementById("display-name");
  var emailInput = document.getElementById("email");
  var consentCheck = document.getElementById("consent-check");
  var tbody = document.getElementById("events-body");
  var dialog = document.getElementById("delete-dialog");

  function say(text, isError) {
    message.textContent = text;
    message.classList.toggle("error", Boolean(isError));
  }

  function cell(row, value, label) {
    var td = document.createElement("td");
    td.setAttribute("data-label", label);
    td.textContent = value || "—";
    row.appendChild(td);
  }

  function render() {
    var p = current.profile;
    nameInput.value = p ? p.displayName || "" : "";
    emailInput.value = p ? p.email || "" : "";
    consentCheck.checked = Boolean(p && p.consent);
    localStorage.setItem(window.PsychBehavior.displayNameKey, nameInput.value);

    tbody.textContent = "";
    if (!current.events.length) {
      var empty = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "暂无记录，或你尚未同意统计。";
      empty.appendChild(td);
      tbody.appendChild(empty);
      return;
    }
    current.events.forEach(function (event) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = new Date(event.created_at).toLocaleString("zh-CN");
      tr.appendChild(th);
      cell(tr, event.type, "类型");
      cell(tr, event.path, "页面");
      cell(tr, event.search_term || event.branch_id, "搜索词 / 分支");
      tbody.appendChild(tr);
    });
  }

  async function load() {
    try {
      var response = await fetch("/api/profile?userId=" + encodeURIComponent(userId));
      if (!response.ok) throw new Error("HTTP " + response.status);
      current = await response.json();
      render();
    } catch (error) {
      say("读取失败，请稍后重试。", true);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    userId = window.PsychBehavior.getUserId();
    load();

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var consent = consentCheck.checked;
      try {
        var response = await fetch("/api/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId: userId,
            displayName: nameInput.value.trim(),
            email: emailInput.value.trim(),
            consent: consent
          })
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        window.PsychBehavior.setConsent(consent ? "granted" : "denied");
        say("设置已保存。");
        localStorage.setItem(window.PsychBehavior.displayNameKey, nameInput.value.trim());
        await load();
      } catch (error) {
        say("保存失败，请检查输入后重试。", true);
      }
    });

    document.getElementById("export-json").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "我的行为记录.json";
      link.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById("delete-data").addEventListener("click", function () {
      dialog.showModal();
    });
    document.getElementById("delete-cancel").addEventListener("click", function () {
      dialog.close();
    });
    document.getElementById("delete-confirm").addEventListener("click", async function () {
      try {
        var response = await fetch("/api/profile?userId=" + encodeURIComponent(userId), { method: "DELETE" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        localStorage.removeItem("psy_user_id");
        localStorage.removeItem("psy_consent");
        localStorage.removeItem(window.PsychBehavior.displayNameKey);
        dialog.close();
        location.reload();
      } catch (error) {
        say("删除失败，请稍后重试。", true);
        dialog.close();
      }
    });
  });
})();
