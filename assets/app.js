(function () {
  "use strict";

  const input = document.getElementById("q");
  const cards = Array.from(document.querySelectorAll("[data-branch]"));
  const sections = Array.from(document.querySelectorAll("[data-category-section]"));
  const filters = Array.from(document.querySelectorAll("[data-filter]"));
  const status = document.getElementById("result-status");
  const empty = document.getElementById("empty-state");
  let active = "all";

  function applyFilters() {
    const term = input ? input.value.trim().toLocaleLowerCase("zh-CN") : "";
    let shown = 0;

    cards.forEach(function (card) {
      const inCategory = active === "all" || card.dataset.category === active;
      const matchesText = !term || card.dataset.search.indexOf(term) !== -1;
      const visible = inCategory && matchesText;
      card.hidden = !visible;
      if (visible) shown += 1;
    });

    sections.forEach(function (section) {
      const anyVisible = Array.from(section.querySelectorAll("[data-branch]")).some(function (card) {
        return !card.hidden;
      });
      section.hidden = !anyVisible;
    });

    if (status) {
      status.textContent = term || active !== "all"
        ? "找到 " + shown + " 个分支"
        : "共 " + cards.length + " 个分支";
    }

    if (empty) {
      empty.hidden = shown !== 0;
    }
  }

  if (input) {
    input.addEventListener("input", applyFilters);
  }

  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      active = button.dataset.filter;
      filters.forEach(function (item) {
        item.setAttribute("aria-pressed", String(item === button));
      });
      applyFilters();
    });
  });

  document.addEventListener("keydown", function (event) {
    if (!input || event.key !== "/" || event.isComposing) return;
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    event.preventDefault();
    input.focus();
  });

  applyFilters();
})();
