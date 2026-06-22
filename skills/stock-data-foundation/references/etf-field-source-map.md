# ETF 字段来源矩阵

ETF 不使用普通股票财务字段。ROE、商誉、扣非净利润等上市公司字段应写 `not_applicable`，并改用本矩阵。

| 字段组 | 字段 | P0 | P1 | P2 | 首选来源 | 备用来源 | 缺失处理 |
|---|---|---|---|---|---|---|---|
| 身份 | `identity.code` / `identity.name` / `identity.exchange` / `identity.security_type` | 必填 | 必填 | 必填 | 交易所、基金公告 | 天天基金、东方财富基金页 | code/name/exchange 缺失则 packet=`failed` |
| 管理信息 | `fund.manager_company` / `fund.custodian` / `fund.managers` | 简版 | 必填 | 必填 | 基金合同、招募说明书、基金公告 | 天天基金、基金公司官网 | P2 缺失则 `P2-incomplete` |
| 跟踪对象 | `fund.tracking_index` / `fund.index_provider` | 必填 | 必填 | 必填 | 招募说明书、基金合同 | 天天基金、基金公司官网 | 缺跟踪指数不能输出 ETF 逻辑 |
| 费率 | `fund.management_fee` / `fund.custody_fee` / `fund.subscription_redemption_fee` | 可选 | 建议 | 必填 | 招募说明书、基金详情页 | 天天基金 | 缺失不影响短线体检，但影响知识库完整度 |
| 规模份额 | `fund.scale` / `fund.shares_change` / `fund.holder_structure` | 可选 | 必填 | 必填 | 定期报告 | 天天基金页面数据 | P2 缺失则 `P2-incomplete` |
| 持仓 | `fund.top_holdings` / `fund.top_holdings_weight` / `fund.stock_position` | 可选 | 必填 | 必填 | 定期报告 | 天天基金页面数据 | 缺持仓不能判断主题暴露 |
| 净值收益 | `fund.nav` / `fund.return_1m` / `fund.return_3m` / `fund.return_6m` / `fund.return_1y` | 可选 | 必填 | 必填 | 基金公司、天天基金 | 东方财富基金页 | 缺净值收益则标 `missing` |
| 二级市场 | `quote.price` / `quote.change_pct` / `quote.turnover_amount` / `quote.turnover_rate` / `quote.premium_discount` | 可选 | 必填 | 必填 | 交易所行情、行情接口 | 东方财富行情页 | 持仓体检缺失则不能输出盘中判断 |
| 跟踪质量 | `fund.tracking_error` / `fund.premium_discount_history` / `fund.liquidity` | 可选 | 建议 | 必填 | 基金定期报告、交易所行情 | 天天基金、东方财富 | 缺失需列入 ETF 风险缺口 |
| 主题风险 | `theme.index_volatility` / `theme.sector_concentration` / `theme.component_risk` | 核心标签 | 必填 | 必填 | 定期报告、指数资料 | 本地复盘报告 | 本地复盘只作市场情绪补充 |
| 本地上下文 | `portfolio.*` / `selection.*` / `daily_review.*` | 场景相关 | 场景相关 | 场景相关 | 本仓库 output 事实源 | 无 | 本地缺失按 `not_applicable` 或 `missing` |

## ETF P2 必填字段

- `fund.tracking_index`
- `fund.managers`
- `fund.management_fee`
- `fund.scale`
- `fund.shares_change`
- `fund.top_holdings`
- `fund.top_holdings_weight`
- `fund.stock_position`
- `quote.price`
- `quote.premium_discount`
- `quote.turnover_amount`
- `fund.tracking_error` 或缺失原因
- `theme.sector_concentration` 或缺失原因

## 业务降级

- 缺跟踪指数：`cannot-explain-etf-exposure`。
- 缺前十大持仓或权重：`cannot-verify-theme-exposure`。
- 缺折溢价：`premium-discount-unavailable`。
- 缺跟踪误差：`tracking-quality-unavailable`。
