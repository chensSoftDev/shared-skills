---
name: stock-news-sector-tracker
description: 当用户希望建立“消息→板块→个股”的联动跟踪系统，或需要盘前/盘中/盘后基于消息和盘面识别短线机会、跟踪板块异动、生成观察清单时使用。
version: 1.1.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [a-share, news, sector, stock, short-term-trading, opportunity-tracking]
    related_skills: [stock-daily-review, stock-selection, stock-portfolio-tracking, stock-data-foundation]
---

# 消息-板块-个股联动跟踪（News-Sector-Stock Tracker）

## 角色

本 Skill 负责建立和维护一套“消息 → 板块 → 个股”的联动跟踪系统，帮助短线交易者：

1. 收盘前发现**尚未反应的利好**（埋伏买点）
2. 开盘竞价时确认**资金认可方向**（跟进买点）
3. 盘中识别**风险信号**（止损/止盈/异动提醒）
4. 长期沉淀**板块-个股映射**和**事件反应规律**

## 约束

### 数据来源

- 必须联网实时抓取，不能依赖记忆或历史行情
- 消息来源优先级：交易所公告 > 公司公告 > 权威媒体（财联社/证券时报/上海证券报/每日经济新闻） > 互动易回复 > 市场传闻
- 行情来源优先级：腾讯 qt.gtimg.cn > 新浪财经 hq.sinajs.cn > 东方财富网页
- 资金流向：新浪财经 html 页面或东方财富资金流向页面

### 消息可信度分级

| 等级 | 来源 | 使用方式 |
|------|------|----------|
| 高 | 交易所公告、公司公告、权威媒体报道 | 可作为核心催化 |
| 中 | 互动易回复、行业媒体、券商研报 | 可作为辅助催化 |
| 低 | 股吧、自媒体、未证传闻 | 仅标注为情绪加成，不得作为核心逻辑 |

### 板块状态定义

状态判定细则、评分公式和操作建议见 [`references/scoring-rules.md`](references/scoring-rules.md)。

| 状态 | 含义 | 操作含义 |
|------|------|----------|
| 埋伏 | 消息已出，板块/个股未明显反应 | 最佳买点 |
| 确认 | 竞价/开盘已放量异动 | 可轻仓跟进 |
| 加速 | 龙头已涨停，后排跟风 | 不再追 |
| 错过 | 已涨停或涨幅过大 | 等待分歧 |
| 风险 | 利好兑现、后排走弱、大盘拖累 | 观望或止损 |
| 调整 | 无新催化，资金流出 | 不进场 |

### 输出要求

- 每次扫描必须生成数据表格
- 必须结合当前持仓（`output/stock-portfolio-tracking/portfolio.csv`）
- 所有输出必须写入 `output/stock-news-sector-tracker/` 目录
- 盘前/盘中扫描可生成简表；盘后扫描必须输出完整报告并提交 git

## 上下文

### 相关文件路径

```
/opt/codebase/stock/
├── .agents/
│   └── skills-config.json                       # 项目统一配置，读取 stockNewsSectorTracker 段
├── output/
│   ├── stock-news-sector-tracker/
│   │   ├── daily-scans/YYYY-MM-DD-{brief|full}.md   # 每日扫描报告（盘前简版/盘后完整版）
│   │   ├── opportunities/{sector_key}-YYYY-MM-DD.md # 单个机会档案，sector_key 为板块拼音或英文缩写
│   │   ├── registry/sector-registry.csv             # 板块池
│   │   └── registry/stock-sector-map.csv            # 个股→板块映射
│   ├── stock-portfolio-tracking/
│   │   └── portfolio.csv                            # 当前持仓
│   ├── stock-selection/
│   │   └── candidates/candidates-active.csv         # 候选库（机会转候选时写入）
│   └── stock-data-foundation/
│       └── packets/                                 # 行情/资金流向字段级数据包
└── .shared-skills/skills/stock-news-sector-tracker/
    ├── SKILL.md
    └── references/
        ├── workflow.md
        ├── scoring-rules.md
        └── templates/
            └── daily-scan-template.md
```

### 配置参数

参见 `.agents/skills-config.json` 中的 `stockNewsSectorTracker` 段：

```json
"stockNewsSectorTracker": {
  "schedule": { "pre_market": "08:20", "post_market": "22:00", "intraday": [...] },
  "data_sources": { "news": [...], "price": [...], "kline": [...], "moneyflow": [...], "index": [...] },
  "tracking_sectors": [...],
  "scoring_rules": { "opportunity_score": {...}, "status_map": {...} },
  "output": {
    "daily_scan_dir": "output/stock-news-sector-tracker/daily-scans",
    "opportunity_dir": "output/stock-news-sector-tracker/opportunities",
    "registry_dir": "output/stock-news-sector-tracker/registry",
    "portfolio_path": "output/stock-portfolio-tracking/portfolio.csv"
  }
}
```

### 默认覆盖板块

默认板块来自 `skills-config.json` 中的 `tracking_sectors`：

- 半导体-封测
- 半导体-存储
- 半导体-设备
- AI 上游-光模块
- AI 上游-PCB
- AI 上游-液冷
- 有色金属-铜
- 有色金属-锡
- 小金属-铟/磷化铟
- 创新药

## 工作流

### 1. 读取配置和注册表

每次执行时：
1. 读取 `/.agents/skills-config.json` 中的 `stockNewsSectorTracker` 段
2. 读取 `output/stock-portfolio-tracking/portfolio.csv`（如存在；不存在则视为空仓）
3. 读取 `output/stock-news-sector-tracker/registry/sector-registry.csv`；**不存在时**，基于 `tracking_sectors` 初始化
4. 读取 `output/stock-news-sector-tracker/registry/stock-sector-map.csv`；**不存在时**，基于 `tracking_sectors` 中的 `leaders` 初始化

注册表初始化格式：

- `sector-registry.csv`：`name,keywords,etfs,leaders,status,notes`
- `stock-sector-map.csv`：`code,name,sectors,role,notes`（`role` 可选值：`leader`/`中军`/`后排`/`关联`）

### 2. 消息扫描

按以下维度扫描消息：
1. **涨价**：行业产品涨价、原材料涨价、海外龙头提价
2. **扩产/产能**：新建产线、并购、设备招标
3. **政策**：国家/地方产业规划、补贴政策、监管变化
4. **技术突破**：论文、专利、新产品发布
5. **海外映射**：美股/港股相关板块大涨、国际事件
6. **公司事件**：订单、中标、业绩预告、重大合同、公告

### 3. 行情与资金流向验证

对每个关注的板块：
1. 获取 ETF/指数实时行情
2. 获取龙头股（3-5 只）实时行情
3. 获取资金流向（超大单/大单/中单/小单）
4. 判断板块状态：埋伏 / 确认 / 加速 / 错过 / 风险 / 调整

数据字段尽量复用 `stock-data-foundation` 的字段级数据包；若数据包不存在，再按配置中的 `data_sources` 实时抓取。

### 4. 生成每日扫描报告

报告必须包含以下表格：
1. **消息事件表**：事件、来源、可信度、影响板块、发生时间、是否已反应
2. **板块响应表**：板块、ETF、涨幅、龙头、中军、后排、状态、强度评分
3. **个股联动表**：个股、代码、板块、涨幅、涨停时间、封单、关联事件、逻辑档位、状态
4. **机会评分表**：板块、机会、状态、评分、最佳买点、当前风险
5. **次日观察清单**：标的、观察点、触发条件、应对策略
6. **持仓联动**：结合当前持仓给出提醒

术语说明：
- **龙头**：板块内最先涨停、涨幅最大、带动性最强的领涨股
- **中军**：板块内市值较大、走势稳定、对板块情绪有稳定作用的标的
- **后排**：涨幅靠后、跟风为主、辨识度较低的标的
- **逻辑档位**：核心（直接受益）/ 次核心（间接受益）/ 擦边（概念沾边）

### 5. 生成机会档案（可选）

对评分 ≥ 7 或状态为“埋伏/确认”的重点机会单独建立档案：
- 机会定义
- 消息-板块-个股链路
- 最佳买点复盘
- 后续跟踪
- 事件反应规律沉淀
- 教训

### 6. 与选股系统联动（可选）

对状态为“埋伏”或“确认”且评分 ≥ 7 的机会，若标的未在当前持仓中，可建议写入 `stock-selection` 候选库：

1. 读取 `output/stock-selection/candidates/candidates-active.csv`
2. 若标的已存在，更新 `source` 和 `score`
3. 若不存在，追加一行，字段至少包含：
   - `code,name,source,score,status,buy_logic,stop_loss,risk_level,notes`
   - `source` 标记为 `sector-tracker:{板块名}`
4. 输出联动记录到当日扫描报告

### 7. 错误处理与降级

- 任一行情源失败时，按 `data_sources` 中配置的优先级尝试下一个来源
- 所有来源均失败时，在报告中标注“数据缺失”，不得编造行情
- 新闻源反爬或不可用时，优先使用已抓取的公告/交易所信息，并标注来源受限

### 8. 提交 git

盘后完整扫描完成后：
1. `git add output/stock-news-sector-tracker/ .agents/skills-config.json`
2. `git commit -m "消息-板块-个股联动跟踪：{日期} 盘后扫描报告"`
3. `git push origin main`

盘中简报若涉及配置或注册表更新，也可单独提交，commit message 使用：
- `盘中扫描：{日期} {时间} 板块异动简报`

## 输出模板

见 [`references/templates/daily-scan-template.md`](references/templates/daily-scan-template.md)。

## 自检清单

完成一次盘后扫描后，检查以下项：

- ✅ 是否从 `.agents/skills-config.json` 读取了 `stockNewsSectorTracker` 配置？
- ✅ 注册表文件是否存在？不存在时是否已初始化？
- ✅ 消息事件表是否标注了来源和可信度？
- ✅ 板块响应表是否包含状态、强度评分和资金流向？
- ✅ 是否结合了当前持仓给出提醒？
- ✅ 重点机会是否生成了机会档案？
- ✅ 是否需要将高评分机会同步到 `stock-selection` 候选库？
- ✅ 盘后报告是否已提交 git？
- ✅ 所有结论是否附来源链接或数据来源说明？
