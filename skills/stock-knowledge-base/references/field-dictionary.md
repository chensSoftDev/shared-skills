# 字段字典

## index.csv 表头

```csv
code,name,exchange,board,industry,knowledge_level,status,risk_level,current_view,last_reviewed,data_as_of,core_tags,in_portfolio,in_candidates,in_daily_review,last_event_date,card_path,notes
```

## 字段说明

| 字段 | 含义 | 允许值或规则 |
|------|------|--------------|
| `code` | 6 位股票代码 | 保留前导零，例如 `000001` |
| `name` | 股票简称 | 使用当前证券简称 |
| `exchange` | 交易所 | `SH` / `SZ` / `BJ` / `待核验` |
| `board` | 所属板块 | 主板 / 创业板 / 科创板 / 北交所 / 待核验 |
| `industry` | 所属行业 | 使用可靠来源口径，无法确认写 `待核验` |
| `knowledge_level` | 知识等级 | `P0` / `P1` / `P2` |
| `status` | 知识卡状态 | `active` / `stale` / `archived` / `forbidden` |
| `risk_level` | 风险等级 | `low` / `medium` / `high` / `forbidden` / `unknown` |
| `current_view` | 当前观点 | 忽略 / 观察 / 候选 / 持仓跟踪 / 禁入 / 待核验 |
| `last_reviewed` | 最近复核日期 | `YYYY-MM-DD` |
| `data_as_of` | 数据截止日期 | `YYYY-MM-DD` 或带时间的来源时间 |
| `core_tags` | 核心标签 | 多个标签用英文分号 `;` 分隔 |
| `in_portfolio` | 是否在持仓 | `yes` / `no` |
| `in_candidates` | 是否在候选库 | `yes` / `no` |
| `in_daily_review` | 是否出现在每日复盘 | `yes` / `no` |
| `last_event_date` | 最近重大事件日期 | `YYYY-MM-DD`；没有则留空 |
| `card_path` | 个股卡路径 | `output/stock-knowledge-base/cards/{code}-{name}.md` |
| `notes` | 简短备注 | 不写长文；长文写入个股卡 |

## 文件命名

个股卡路径固定为：

```text
output/stock-knowledge-base/cards/{code}-{name}.md
```

示例：

```text
output/stock-knowledge-base/cards/000001-平安银行.md
output/stock-knowledge-base/cards/300750-宁德时代.md
output/stock-knowledge-base/cards/688981-中芯国际.md
```

## frontmatter 元数据字段

个股卡 frontmatter 元数据区至少包含：

```yaml
code: ""
name: ""
exchange: ""
board: ""
industry: ""
knowledge_level: "P0"
status: "active"
risk_level: "unknown"
current_view: "待核验"
last_reviewed: ""
data_as_of: ""
sources: []
data_packet_path: ""
data_packet_status: "complete|partial|failed"
completeness: "complete|P2-incomplete|P1-incomplete|P0-incomplete"
missing_required_fields: []
```

新增字段说明：

| 字段 | 含义 | 允许值或规则 |
|------|------|--------------|
| `data_packet_path` | 对应 `stock-data-foundation` 数据包路径 | `output/stock-data-foundation/packets/YYYY-MM-DD/{code}-{name}.json` |
| `data_packet_status` | 数据包状态 | `complete` / `partial` / `failed` |
| `completeness` | 知识卡完整度 | `complete` / `P2-incomplete` / `P1-incomplete` / `P0-incomplete` |
| `missing_required_fields` | 缺失核心字段 | YAML 列表；CSV 备注中用英文分号摘要 |

## 写入规则

- CSV 使用 UTF-8。
- CSV 中多标签使用英文分号 `;`，不要使用中文顿号。
- 路径中的股票名称使用证券简称原文；若名称包含 `/`，替换为 `-`。
- 字段无法可靠核验时写 `待核验` 或 `unknown`，不要空口补全。
- `notes` 只写短摘要，详细依据写入个股卡对应章节。
