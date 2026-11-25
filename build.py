"""Generate the psychology discipline map: one hub page plus one page per branch."""

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def esc(value):
    return html.escape(str(value), quote=True)


def image_for(item_id):
    folder = ROOT / "assets" / "images" / item_id
    if folder.is_dir():
        for pattern in ("*.webp", "*.png", "*.jpg", "*.jpeg"):
            found = sorted(folder.glob(pattern))
            if found:
                return "assets/images/" + item_id + "/" + found[0].name
    return None


cats = [json.loads((ROOT / "data" / f"{name}.json").read_text(encoding="utf-8"))
        for name in ("basic", "applied", "emerging")]

items = []
for cat in cats:
    for item in cat["items"]:
        merged = dict(item)
        merged["cat"] = cat["id"]
        merged["catname"] = cat["name"]
        items.append(merged)

lookup = {item["id"]: item for item in items}

ART = """<svg class="hero-art" viewBox="0 0 320 260" role="img" aria-label="抽象神经网络示意图">
  <circle class="halo" cx="160" cy="130" r="104"/>
  <circle cx="160" cy="130" r="76" stroke-width="1.5"/>
  <circle cx="160" cy="130" r="44" stroke-width="2"/>
  <path d="M160 54 L212 88 L226 150 L182 200 L112 196 L72 146 L96 82 Z" stroke-width="1.5"/>
  <path d="M160 130 L212 88 M160 130 L226 150 M160 130 L182 200 M160 130 L112 196 M160 130 L72 146 M160 130 L96 82" stroke-width="1.2"/>
  <circle class="node" cx="160" cy="54" r="7"/>
  <circle class="node" cx="212" cy="88" r="5"/>
  <circle class="node" cx="226" cy="150" r="7"/>
  <circle class="node" cx="182" cy="200" r="5"/>
  <circle class="node" cx="112" cy="196" r="7"/>
  <circle class="node" cx="72" cy="146" r="5"/>
  <circle class="node" cx="96" cy="82" r="6"/>
  <circle class="node" cx="160" cy="130" r="10"/>
</svg>"""

CSS_LINK = (
    '<link rel="stylesheet" href="assets/style.css">\n'
    '<link rel="stylesheet" href="assets/behavior.css">\n'
    '<script src="assets/app.js" defer></script>\n'
    '<script src="assets/behavior.js" defer></script>'
)


def head(title, description, cat):
    return (
        '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<title>{esc(title)}</title>\n'
        f'<meta name="description" content="{esc(description)}">\n'
        '<meta name="author" content="gnoscerer">\n'
        '<meta name="copyright" content="© 2026 gnoscerer. All rights reserved.">\n'
        f'{CSS_LINK}\n</head>\n<body data-cat="{esc(cat)}">\n'
        '<a class="skip-link" href="#main">跳到主要内容</a>\n'
    )


def header(active=None):
    parts = ['<header class="site-header"><div class="wrap header-inner">']
    current = ' aria-current="page"' if active == "home" else ""
    parts.append(f'<a class="brand" href="index.html"{current}>'
                 '<span class="brand-mark" aria-hidden="true">心</span>'
                 '<span>心理学学科地图</span></a>')
    parts.append('<nav class="nav" aria-label="主导航">')
    for cat in cats:
        cid = cat["id"]
        parts.append(f'<a href="index.html#{cid}">{esc(cat["name"])}</a>')
    parts.append('<a href="admin.html">行为看板</a>')
    parts.append('</nav></div></header>\n')
    return "".join(parts)


def footer():
    return ('<footer class="footer"><div class="wrap footer-inner">'
            '<div><div>© 2026 gnoscerer. 保留所有权利。</div>'
            '<div>联系：<a href="mailto:gnoscerer@gmail.com">gnoscerer@gmail.com</a></div></div>'
            '<a href="index.html">返回总览 ↑</a>'
            '</div></footer>\n</body>\n</html>\n')


def branch_card(item, show_badge=True):
    badge = f'<span class="badge">{esc(item["catname"])}</span>' if show_badge else ""
    src = image_for(item["id"])
    thumb = (
        f'<img class="card-thumb" src="{esc(src)}" '
        f'alt="{esc(item.get("image_alt", item["name"]))}" '
        'loading="lazy" decoding="async" width="1280" height="853">'
    ) if src else ""
    search = " ".join([
        item["name"], item["en"], item["tagline"], item["intro"],
        " ".join(item["concepts"]), item["catname"],
    ]).lower()
    return (
        f'<article class="card branch-card" data-branch data-category="{esc(item["cat"])}" '
        f'data-search="{esc(search)}">'
        f'{thumb}'
        f'<div class="card-meta">{badge}<span class="card-en">{esc(item["en"])}</span></div>'
        f'<h3><a class="card-link" href="{esc(item["id"])}.html">{esc(item["name"])}</a></h3>'
        f'<p>{esc(item["tagline"])}</p>'
        '</article>'
    )


def build_hub():
    parts = [head("心理学学科地图｜41 个分支的结构化索引",
                  "普通心理学、实验心理学、认知神经科学、临床心理学等 41 个心理学分支的科普索引。",
                  "hub")]
    parts.append(header("home"))
    parts.append('<main id="main">')

    parts.append(
        '<div class="hero"><div class="wrap hero-inner"><div>'
        '<p class="eyebrow">PSYCHOLOGY · 学科全景</p>'
        '<h1>心理学学科地图</h1>'
        '<p class="hero-en">A Map of the Psychological Sciences</p>'
        '<p class="tagline">从基础机制到应用场景，41 个分支一次看清</p>'
        '<p class="lead">心理学既研究感知、记忆与情绪等基本心理过程，也走进课堂、组织、临床与司法现场。'
        '这里把各分支按「基础 — 应用 — 交叉新兴」三层展开，每一分支都单独成页，标注核心议题、常用方法、'
        '应用场景与相邻方向，方便按图索骥。</p>'
        '<div class="stats">'
        '<div class="stat"><strong>41</strong><span>个学科分支</span></div>'
        '<div class="stat"><strong>3</strong><span>大类板块</span></div>'
        '<div class="stat"><strong>1</strong><span>张检索地图</span></div>'
        '</div></div>' + ART + '</div></div>'
    )

    parts.append(
        '<section aria-labelledby="explore-title"><div class="wrap">'
        '<div class="section-head"><h2 id="explore-title">查找分支</h2>'
        '<p>输入关键词，或按类别筛选；按 / 可快速定位输入框</p></div>'
        '<search aria-label="筛选心理学分支"><div class="search-bar">'
        '<div class="field"><label for="q">搜索分支名称、概念或英文名</label>'
        '<input type="search" id="q" name="q" placeholder="例如：记忆、脑、组织、文化" '
        'autocomplete="off" autocapitalize="none" spellcheck="false"></div>'
        '<div class="field category-filter">'
        '<span class="visually-hidden">按类别筛选</span>'
        '<div class="filters" role="group" aria-label="学科类别">'
        '<button class="filter-btn" type="button" data-filter="all" aria-pressed="true">全部</button>'
    )
    for cat in cats:
        parts.append(f'<button class="filter-btn" type="button" data-filter="{esc(cat["id"])}" '
                     f'aria-pressed="false">{esc(cat["name"])}</button>')
    parts.append('</div></div></div></search>'
                 '<p class="result-status" id="result-status" role="status" aria-live="polite">共 41 个分支</p>'
                 '<div class="empty-state" id="empty-state" hidden>没有匹配的分支，换个关键词试试。</div>'
                 '</div></section>')

    for cat in cats:
        cid = cat["id"]
        parts.append(
            f'<section id="{cid}" data-category-section aria-labelledby="title-{cid}"><div class="wrap">'
            f'<div class="section-head"><h2 id="title-{cid}">{esc(cat["name"])}</h2>'
            f'<p>{esc(cat["desc"])}</p></div><div class="grid">'
        )
        for item in items:
            if item["cat"] == cid:
                parts.append(branch_card(item, show_badge=False))
        parts.append('</div></div></section>')

    parts.append(
        '<section aria-labelledby="path-title"><div class="wrap">'
        '<div class="section-head"><h2 id="path-title">怎么用这张地图</h2></div>'
        '<div class="path-grid">'
        '<div class="path-step"><h3>先看板块</h3><p>基础板块解释心理现象与研究方法，应用板块对应真实场景，'
        '交叉板块呈现与神经科学、计算和文化研究结合的新方向。</p></div>'
        '<div class="path-step"><h3>再读单页</h3><p>每个分支页面用统一结构拆解：主题插画、核心议题、'
        '经典研究、争议前沿、动手练习、方法场景与延伸阅读。</p></div>'
        '<div class="path-step"><h3>顺着关联走</h3><p>每页底部的「相邻分支」给出三条跨领域线索，'
        '适合把孤立知识点连成网络。</p></div>'
        '</div></div></section>'
    )

    parts.append(footer())
    (ROOT / "index.html").write_text("".join(parts), encoding="utf-8")


def panel(title, entries):
    parts = [f'<div class="panel"><h3>{esc(title)}</h3><ul class="list-clean">']
    for entry in entries:
        parts.append(f'<li><strong>{esc(entry["title"])}</strong> · {esc(entry["desc"])}</li>')
    parts.append('</ul></div>')
    return "".join(parts)


def build_branch(item):
    cid = item["id"]
    cat = item["cat"]
    siblings = [entry for entry in cats if entry["id"] == cat][0]["items"]
    position = next(index for index, entry in enumerate(siblings) if entry["id"] == cid)
    prev_item = siblings[position - 1] if position > 0 else None
    next_item = siblings[position + 1] if position < len(siblings) - 1 else None

    description = item["tagline"] + " " + item["intro"][:110]
    parts = [head(f'{item["name"]}｜{item["catname"]}｜心理学学科地图', description, cat)]
    parts.append(header())
    parts.append('<main id="main">')

    parts.append(
        '<div class="hero"><div class="wrap hero-inner"><div>'
        '<div class="crumbs"><a href="index.html">总览</a><span>/</span>'
        f'<a href="index.html#{cat}">{esc(item["catname"])}</a><span>/</span>'
        f'<span>{esc(item["name"])}</span></div>'
        f'<p class="eyebrow">{esc(item["catname"])} · DISCIPLINE</p>'
        f'<h1>{esc(item["name"])}</h1>'
        f'<p class="hero-en">{esc(item["en"])}</p>'
        f'<p class="tagline">{esc(item["tagline"])}</p>'
        f'<p class="lead">{esc(item["intro"])}</p>'
    )
    if item.get("note"):
        parts.append(f'<div class="note">{esc(item["note"])}</div>')

    src = image_for(cid)
    if src:
        hero_visual = (
            '<figure class="hero-figure">'
            f'<img src="{esc(src)}" alt="{esc(item["image_alt"])}" '
            'loading="eager" fetchpriority="high" decoding="async" width="1280" height="853">'
            f'<figcaption>{esc(item["image_caption"])}</figcaption>'
            '</figure>'
        )
    else:
        hero_visual = ART
    parts.append('</div>' + hero_visual + '</div></div>')

    parts.append('<section aria-labelledby="topics-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="topics-title">核心议题</h2>'
                 '<p>这个分支主要研究什么</p></div><div class="grid">')
    for index, topic in enumerate(item["topics"], start=1):
        parts.append(
            f'<article class="card"><span class="topic-no">{index:02d}</span>'
            f'<h3>{esc(topic["title"])}</h3><p>{esc(topic["desc"])}</p></article>'
        )
    parts.append('</div></div></section>')

    parts.append('<section aria-labelledby="why-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="why-title">为什么值得学</h2>'
                 '<p>这一分支能带来什么</p></div><div class="panel why-panel">'
                 f'<h3>{esc(item["why"]["title"])}</h3>'
                 f'<p>{esc(item["why"]["desc"])}</p>'
                 '</div></div></section>')

    parts.append('<section aria-labelledby="case-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="case-title">经典研究</h2>'
                 '<p>一项奠定了这个领域的研究</p></div>'
                 '<article class="panel case-panel">'
                 f'<h3>{esc(item["case"]["title"])}</h3>'
                 f'<p>{esc(item["case"]["desc"])}</p>'
                 '</article></div></section>')

    parts.append('<section aria-labelledby="debate-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="debate-title">争议与前沿</h2>'
                 '<p>还没定论的问题，往往最值得追问</p></div><div class="grid compact">')
    for debate in item["debates"]:
        parts.append('<article class="card"><span class="badge">前沿议题</span>'
                     f'<h3>{esc(debate["title"])}</h3><p>{esc(debate["desc"])}</p></article>')
    parts.append('</div></div></section>')

    parts.append('<section aria-labelledby="try-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="try-title">动手试一试</h2>'
                 '<p>把概念带回日常观察</p></div><div class="panel try-panel">'
                 f'<h3>{esc(item["try_it"]["title"])}</h3>'
                 f'<p>{esc(item["try_it"]["desc"])}</p>'
                 '</div></div></section>')

    parts.append('<section aria-labelledby="practice-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="practice-title">方法与场景</h2>'
                 '<p>怎么研究，用在哪里</p></div><div class="split">'
                 + panel("研究方法", item["methods"])
                 + panel("应用场景", item["applications"])
                 + '</div></div></section>')

    parts.append('<section aria-labelledby="concepts-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="concepts-title">关键概念</h2>'
                 '<p>进入这个分支的术语入口</p></div><div class="panel"><div class="tags">')
    for concept in item["concepts"]:
        parts.append(f'<span class="tag">{esc(concept)}</span>')
    parts.append('</div></div></div></section>')

    parts.append('<section aria-labelledby="figures-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="figures-title">代表人物</h2>'
                 '<p>与这一领域密切相关的名字</p></div><div class="grid compact">')
    for figure in item["figures"]:
        parts.append(f'<article class="card"><h3>{esc(figure["name"])}</h3>'
                     f'<p>{esc(figure["note"])}</p></article>')
    parts.append('</div></div></section>')

    parts.append('<section aria-labelledby="reading-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="reading-title">延伸阅读</h2></div>'
                 '<div class="panel"><ol class="book-list">')
    for book in item["reading"]:
        parts.append(f'<li>{esc(book)}</li>')
    parts.append('</ol></div></div></section>')

    parts.append('<section aria-labelledby="related-title"><div class="wrap">'
                 '<div class="section-head"><h2 id="related-title">相邻分支</h2>'
                 '<p>沿着这些问题继续往下看</p></div><div class="grid compact">')
    for related_id in item["related"]:
        related = lookup[related_id]
        parts.append(branch_card(related))
    parts.append('</div>')

    parts.append('<div class="section-head pager-head">'
                 '<p>同类别继续浏览：</p></div><div class="pager" aria-label="同类分支翻页">')
    if prev_item:
        parts.append(f'<a href="{esc(prev_item["id"])}.html">← {esc(prev_item["name"])}</a>')
    parts.append(f'<a href="index.html#{cat}">返回{esc(item["catname"])}</a>')
    if next_item:
        parts.append(f'<a href="{esc(next_item["id"])}.html">{esc(next_item["name"])} →</a>')
    parts.append('</div></div></section>')

    parts.append(footer())
    (ROOT / f"{cid}.html").write_text("".join(parts), encoding="utf-8")


def main():
    build_hub()
    for item in items:
        build_branch(item)
    print(f"generated index.html + {len(items)} branch pages")


if __name__ == "__main__":
    main()
