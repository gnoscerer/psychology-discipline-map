# 心理学学科地图

一个零依赖的中文静态站点：1 个总览首页 + 41 个心理学分支独立页面，按「基础心理学 / 应用心理学 / 交叉与新兴方向」三大类组织。

每个分支页配有专属主题插画（WebP）和图注，并包含核心议题、为什么值得学、经典研究、争议与前沿、动手试一试、研究方法、应用场景、关键概念、代表人物与延伸阅读等板块。总览首页的每张分支卡片也带缩略图。原始插画归档在站点目录外的 `../_source-images/`，不会随网站部署。

## 线上地址

- Cloudflare Pages：https://psychology-discipline-map.pages.dev/
- 行为分析看板：https://psychology-discipline-map.pages.dev/admin.html
- GitHub：https://github.com/gnoscerer/psychology-discipline-map

## 本地预览

直接打开 `index.html`，或启动本地服务器：

```bash
python -m http.server 8080
# http://localhost:8080
```

## 内容维护

文案集中在：

- `data/basic.json`（14 个基础分支）
- `data/applied.json`（17 个应用分支）
- `data/emerging.json`（10 个交叉新兴分支）

改完数据后重新生成全部页面：

```bash
python build.py
```

页面样式在 `assets/style.css`，首页搜索与筛选逻辑在 `assets/app.js`。`build.py` 会覆盖所有 HTML，请不要直接编辑生成后的 HTML。

## 用户行为管理

本站使用 Cloudflare D1 + Pages Functions 实现匿名行为管理，不加载任何第三方统计脚本：

- 匿名统计默认开启，无需访客确认；页面浏览、搜索、筛选、点击、滚动深度与停留时长会自动记录。
- 匿名标识保存在浏览器本地，不收集姓名、位置或跨站信息。
- 记录事件类型：`page_view`、`branch_view`、`search`、`filter`、`card_click`、`pager_click`、`scroll`、`engagement`。
- `admin.html`：管理看板，需输入访问令牌；展示访客数、事件趋势、热门分支/页面/搜索词、事件明细筛选与 CSV 导出。
- 管理令牌保存在站点目录外的 `../.psych-admin-token`，并通过 Cloudflare Pages secret `ADMIN_TOKEN` 注入，不进入仓库或前端代码。

API 端点：

- `POST /api/event`：上报匿名事件，自动创建匿名访客记录
- `GET /api/admin/summary`、`/api/admin/events`、`/api/admin/users`：管理看板数据（需 `x-admin-token` 请求头）

数据库建表脚本在 `schema.sql`。建议按需要定期清理超过 180 天的事件数据。

## 部署

Cloudflare Pages（Direct Upload）：

```bash
export CLOUDFLARE_API_TOKEN='<你的 API Token>'
export CLOUDFLARE_ACCOUNT_ID='a39b7cb6d6e7387c7c932c89612c9cab'
npx wrangler@3 pages project create psychology-discipline-map --production-branch=main
npx wrangler@3 pages deploy . --project-name=psychology-discipline-map --branch=main --commit-dirty=true
```

## 版权与联系

© 2026 gnoscerer. 保留所有权利。

联系邮箱：gnoscerer@gmail.com

站点内容仅用于学习与科普，不构成诊断、治疗或用药建议。
