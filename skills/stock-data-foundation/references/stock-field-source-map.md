# 普通股票字段来源矩阵

普通股票使用本矩阵。字段缺失时必须保留缺失状态，不得用题材热度、记忆或主观判断补齐。

| 字段组 | 字段 | P0 | P1 | P2 | 首选来源 | 备用来源 | 缺失处理 |
|---|---|---|---|---|---|---|---|
| 身份 | `identity.code` / `identity.name` / `identity.exchange` / `identity.board` / `identity.listing_date` | 必填 | 必填 | 必填 | 交易所、巨潮、公司公告 | 东方财富 F10、同花顺 F10 | code/name/exchange 缺失则 packet=`failed`；listing_date 可 `missing` |
| 行业 | `identity.industry` / `identity.concept_tags` | 必填 | 必填 | 必填 | 交易所行业、申万/中信口径 | 东方财富行业、同花顺行业 | 可 `missing`，业务 Skill 必须标注行业口径 |
| 特殊状态 | `risk.special_status` / `risk.suspension` / `risk.delisting_risk` / `risk.abnormal_movement` | 必填 | 必填 | 必填 | 交易所公告、行情状态 | 东方财富风险提示、同花顺风险提示 | P1/P2 必须有状态；取不到则 `missing` |
| 股权 | `shareholding.controlling_shareholder` / `shareholding.actual_controller` / `shareholding.enterprise_type` | 可选 | 建议 | 必填 | 最新年报、季报、权益变动公告 | 东方财富股东研究、公司官网 | P2 缺失则 `P2-incomplete` |
| 主营 | `business.main_business` / `business.products` / `business.revenue_structure` / `business.profit_source` | 简版 | 必填 | 必填 | 最新年报“管理层讨论与分析” | 东方财富 F10、公司官网 | P1/P2 缺失则不能标硬逻辑 |
| 财务 | `financial.revenue_growth` / `financial.net_profit_growth` / `financial.deducted_net_profit` / `financial.gross_margin` / `financial.roe` / `financial.operating_cashflow` / `financial.debt_ratio` / `financial.goodwill` | 可选 | 必填 | 必填 | 年报、季报、巨潮定期报告 | 东方财富财务分析、同花顺财务 | P1/P2 缺失则 `P2-incomplete` |
| 估值 | `valuation.market_cap` / `valuation.float_market_cap` / `valuation.pe` / `valuation.pb` / `valuation.ps` | 可选 | 必填 | 必填 | 行情接口、交易终端 | 东方财富行情页、同花顺行情页 | P1/P2 缺失则 `P2-incomplete` |
| 交易 | `quote.price` / `quote.change_pct` / `quote.turnover_amount` / `quote.turnover_rate` / `quote.volume_ratio` / `quote.kline_summary` | 可选 | 必填 | 必填 | 东方财富行情接口、交易所行情 | 东方财富网页、同花顺网页 | 持仓体检缺失则不能输出盘中强弱判断 |
| 资金 | `flow.main_net_inflow` / `flow.large_order` / `flow.super_large_order` / `flow.lhb` | 可选 | 建议 | 必填 | 东方财富资金流、交易所龙虎榜 | 用户盘口观察 | 用户观察必须标 `user_provided` |
| 公告 | `announcement.latest` / `announcement.earnings_forecast` / `announcement.reduction` / `announcement.inquiry` / `announcement.restructuring` | 可选 | 必填 | 必填 | 巨潮、交易所公告 | 东方财富公告接口 | 接口未返回只能写 `announcement-interface-no-result` |
| 题材 | `theme.catalyst` / `theme.evidence` / `theme.logic_strength` / `theme.invalidation` | 核心标签 | 必填 | 必填 | 公告、年报、互动平台、可信资讯 | 本地复盘报告 | 仅本地复盘不能支撑“硬逻辑” |
| 风险 | `risk.financial_abnormality` / `risk.regulatory` / `risk.unlock` / `risk.pledge` / `risk.st` | 必填 | 必填 | 必填 | 交易所、巨潮、年报 | 东方财富风险提示 | 高风险字段缺失时标 `unknown` |
| 技术位 | `technical.support` / `technical.resistance` / `technical.trend` / `technical.invalidation_price` | 可选 | 建议 | 必填 | 行情 K 线、体检报告 | 用户确认风控线、本地持仓体检 | P2 缺失则 `P2-incomplete` |
| 本地上下文 | `portfolio.*` / `selection.*` / `daily_review.*` | 场景相关 | 场景相关 | 场景相关 | 本仓库 output 事实源 | 无 | 本地缺失按 `not_applicable` 或 `missing` |

## P0 必填组

- 身份
- 行业
- 特殊状态
- 主营简述
- 风险标签

## P1 必填组

- 主营拆分
- 核心财务
- 估值
- 交易概况
- 风险标签

## P2 必填组

- 股权
- 完整财务
- 估值
- 公告
- 题材催化与证伪
- 技术关键位
- 风险处理建议
