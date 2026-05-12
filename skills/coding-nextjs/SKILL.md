---
name: coding-nextjs
description: 前端编码规则：设计系统、主题 token、双语、API 基址、确认交互。在编写或修改 apps/web、apps/admin 下代码时使用。
---

# 前端编码规则

## 角色

约束 `apps/web` 和 `apps/admin` 的前端实现方式，确保 Next.js 官网、管理后台和相关 UI 变更保持设计系统、配置、双语和交互一致性。

## 约束

### 适用范围

- `apps/web`：Next.js 14 + shadcn/ui。
- `apps/admin`：Next.js 14 + Ant Design。

### 设计系统

- UI 设计工作必须先读 `DESIGN.md`。
- 涉及颜色、阴影、Tailwind token 时同步参考 `docs/THEME_TOKENS.md`。
- 官网样式优先沿用语义化 token，先更新 `apps/web/app/globals.css` 或 Tailwind token，再落到组件，避免直接堆硬编码颜色。
- 如需参考外部视觉风格，使用 `./scripts/design-md.sh add <brand>` 同步到 `docs/design-md/references/`；不得直接用第三方 `DESIGN.md` 覆盖项目根 `DESIGN.md`，除非用户明确要求重定视觉方向。

### 环境与配置

- API 基址统一来自 `NEXT_PUBLIC_API_BASE_URL`。
- 站点域名统一来自 `NEXT_PUBLIC_SITE_URL`。
- 不在组件中写死环境地址。
- 不在代码中写死生产密钥，配置统一走 `.env` 或 `.env.local`。

### 国际化与交互

- 官网保持 `zh-CN` 和 `en-US` 双语路由与双语字段约束。
- 新增面向官网的内容字段时，应同时考虑中英文内容。
- 管理后台中的删除或不可逆操作必须保留显式确认交互，例如 `Popconfirm` 或等价确认弹窗。
- 日期时间、后台列表类展示应维持本地化格式；前端展示规则变更要同时检查 web 和 admin 端一致性。

## 工作流

### 1. 识别应用边界

- 判断变更属于 `apps/web`、`apps/admin` 或两者共享影响。
- 标记是否涉及设计 token、接口地址、站点 URL、国际化字段或不可逆操作。

### 2. 读取上下文

- UI 变更读取 `DESIGN.md`，涉及 token 时读取 `docs/THEME_TOKENS.md`。
- 配置相关变更确认环境变量来源。
- 官网内容字段变更确认中英文数据结构和路由影响。

### 3. 实施变更

- 沿用当前应用的组件库和样式模式。
- 优先使用语义化 token 和已有组件组合。
- 删除、禁用、覆盖等不可逆操作保留确认交互。

### 4. 验证

- 检查 web/admin 端受影响展示是否一致。
- 检查文本是否需要双语字段。
- 检查代码中是否新增硬编码地址、密钥或生产配置。

## 输入

- 用户指定的前端功能、页面、组件、样式或管理后台交互变更。
- 可选的应用路径，默认按 `apps/web` 和 `apps/admin` 影响面判断。

## 输出

- 符合当前前端约束的代码变更。
- 必要时说明同步调整的 token、环境变量、双语字段或确认交互。

## 自检

- [ ] UI 变更已读取并对齐 `DESIGN.md`。
- [ ] 颜色、阴影和 Tailwind 变更已优先使用语义化 token。
- [ ] API 基址和站点域名来自环境变量。
- [ ] 官网内容字段已考虑 `zh-CN` 和 `en-US`。
- [ ] 删除或不可逆操作保留显式确认。
