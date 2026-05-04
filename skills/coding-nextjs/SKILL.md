---
name: coding-nextjs
description: 前端编码规则：设计系统、主题 token、双语、API 基址、确认交互。在编写或修改 apps/web、apps/admin 下代码时使用。
---

# 前端编码规则

适用于 `apps/web`（Next.js 14 + shadcn/ui）与 `apps/admin`（Next.js 14 + Ant Design）。

## 设计系统

- UI 设计工作必须先读 `DESIGN.md`；涉及颜色、阴影、Tailwind token 时同步参考 `docs/THEME_TOKENS.md`。
- 官网样式优先沿用语义化 token，先更新 `apps/web/app/globals.css` / Tailwind token，再落到组件，避免直接堆硬编码颜色。
- 如需参考外部视觉风格，使用 `./scripts/design-md.sh add <brand>` 同步到 `docs/design-md/references/`；不得直接用第三方 `DESIGN.md` 覆盖项目根 `DESIGN.md`，除非用户明确要求重定视觉方向。

## 环境与配置

- API 基址统一来自 `NEXT_PUBLIC_API_BASE_URL`，站点域名统一来自 `NEXT_PUBLIC_SITE_URL`，不要在组件中写死环境地址。
- 不在代码中写死生产密钥，配置统一走 `.env` / `.env.local`。

## 国际化

- 官网保持 `zh-CN` / `en-US` 双语路由与双语字段约束；新增面向官网的内容字段时，应同时考虑中英文内容。

## 交互约定

- 管理后台中的删除或不可逆操作必须保留显式确认交互，例如 `Popconfirm` 或等价确认弹窗。
- 日期时间、后台列表类展示应维持本地化格式；前端展示规则变更要同时检查 web 和 admin 端一致性。
