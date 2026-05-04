---
name: coding-nestjs
description: NestJS 服务端编码通用规则：安全约定、数据库迁移、精度约定、测试要求。在编写或修改 NestJS 服务端代码时使用。
---

# NestJS 服务端编码规则

> 适用范围由项目 `.agents/skills-config.json` 的 `coding.nestjs.paths` 定义。

## 通用安全约定

- 不在代码中写死生产密钥、域名或对象存储凭据，配置统一走 `.env` / `deploy/*.env`。
- 非公开接口默认要求鉴权。
- JWT strategy 的 `validate()` 返回值必须同时暴露 `id` 与 `userId`，避免业务控制器因服务拆分后 payload 字段不一致而丢失操作人。
- 控制器读取操作人时使用显式类型或 helper（优先 `userId`，兼容 `id`），不要在业务方法里直接散落 `req.user.id` 假设。

## 数据库与迁移

- 生产环境禁止依赖 ORM 自动同步 schema；schema 变更通过 migration、SQL 脚本或明确的数据变更步骤管理。
- 影响数据库 schema、初始化 SQL、历史数据回填、RBAC 初始化的数据变更，都按"需迁移"处理。
- 新增/修改 entity 后，必须同步检查 migration、初始化 SQL/脚本、部署预检与回滚路径；本地开发环境能跑不代表生产可上线。

## 精度与单位

- 涉及价格、数量、重量、尺寸等字段时，必须明确单位与精度，避免隐式浮点换算和不带单位的字段扩散。
- decimal 运算统一按两位小数语义安全计算，禁止直接字符串拼接数字。

## 审计日志

- 所有写操作必须记录审计日志。
- 每次新增功能、接口或关键业务流程时，必须评估是否需要补充操作日志；涉及库存、配置、权限等变更默认优先考虑记录。

## 事务

- 涉及多表写入的操作必须使用事务，保证数据一致性。

## 验证命令

> 具体命令以项目 `.agents/skills-config.json` 的 `coding.nestjs.verifyCommands` 为准。以下为通用参考：

- 全局 lint 和 build 检查
- 单服务 build 验证
- 单元测试
- 涉及鉴权、RBAC、库存、订单等关键变更，必须补或更新对应测试用例
