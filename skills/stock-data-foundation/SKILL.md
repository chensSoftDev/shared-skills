---
name: stock-data-foundation
description: 当用户要求为 A 股股票、ETF、候选股、持仓股、复盘重点股或知识库卡片采集、核验、补全字段级数据来源，建立字段到固定来源、备用来源和缺失处理的流水线，或需要输出可审计 data packet 供股票相关 Skill 使用时触发。
---

# 股票数据基础层（Stock Data Foundation）

## 角色

为股票相关 Skill 提供统一数据采集、核验、fallback 和缺失处理规则。

本 Skill 只输出字段级 data packet，不输出最终研究结论，不给买卖建议，不直接改写持仓、候选库、复盘报告或知识库卡片。

## 写入边界

- 运行数据只写入 `output/stock-data-foundation/`。
- 原始来源快照写入 `output/stock-data-foundation/raw/`。
- 标准数据包写入 `output/stock-data-foundation/packets/YYYY-MM-DD/{code}-{name}.json`。
- 来源流水写入 `output/stock-data-foundation/source-log.csv`。
- 不直接写入其他股票 Skill 的 output 目录。

## 必读参考

- 字段来源优先级：`references/source-priority.md`。
- 普通股票字段矩阵：`references/stock-field-source-map.md`。
- ETF 字段矩阵：`references/etf-field-source-map.md`。
- 数据包结构：`references/data-packet-schema.md`。
- fallback 与质量规则：`references/fallback-and-quality.md`。

## 工作流

1. 明确证券代码、名称、证券类型和调用场景。
2. 判断目标范围：`identity`、`quote`、`announcement`、`financial`、`valuation`、`theme`、`risk`、`portfolio_context` 或 `full`。
3. 按证券类型读取对应字段矩阵。
4. 对每个字段按“首选来源 -> 备用来源 -> 缺失处理”采集。
5. 每个字段写入值、状态、来源、链接、数据时间、置信度、fallback 标记和说明。
6. 若来源冲突，字段状态写 `conflict`，保留冲突来源，不自行挑选有利数据。
7. 输出 data packet JSON，并追加 `source-log.csv`。
8. 运行 `scripts/validate_packet.py` 校验结构。
9. 向调用方返回 packet 路径、完整度、缺口清单和可用字段摘要。

## 输出要求

- packet 路径。
- packet 状态：`complete` / `partial` / `failed`。
- 已核验字段数量。
- 缺失字段数量。
- 冲突字段数量。
- 对业务 Skill 的降级建议，例如 `P2-incomplete`、`cannot-mark-hard-logic`、`quote-unavailable`。

## 数据纪律

- 不能凭记忆补最新行情、财务、公告、监管状态。
- 本地复盘报告可以作为题材上下文，但不能单独支撑硬逻辑。
- 用户持仓文件是持仓事实源，但不是公司基本面来源。
- 接口未返回公告只能写“该接口未检出”，不能写“无公告”。
- ETF 使用 ETF 字段矩阵，不套普通股票财务字段。
