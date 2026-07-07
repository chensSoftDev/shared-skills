---
name: stock-news-sector-tracker
description: 当用户希望建立“消息→板块→个股”的联动跟踪系统，或需要盘前/盘中/盘后基于消息和盘面识别短线机会、跟踪板块异动、生成观察清单时使用。
version: 1.0.0
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
- 完成后必须提交 git

## 上下文

### 相关文件路径

```
/opt/codebase/stock/
├── .agents/
│   └── sector-tracker-config.json              # 本系统配置
├── output/
│   └── stock-news-sector-tracker/
│       ├── daily-scans/YYYY-MM-DD.md           # 每日扫描报告
│       ├── opportunities/{sector}-YYYY-MM-DD.md # 单个机会档案
│       ├── registry/sector-registry.csv          # 板块池
│       └── registry/stock-sector-map.csv       # 个股→板块映射
└── .shared-skills/skills/stock-news-sector-tracker/
    ├── SKILL.md
    └── references/
        ├── workflow.md
        ├── scoring-rules.md
        └── templates/
```

### 默认覆盖板块

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
1. 读取 `/.agents/sector-tracker-config.json`
2. 读取 `output/stock-portfolio-tracking/portfolio.csv`
3. 读取 `output/stock-news-sector-tracker/registry/sector-registry.csv`
4. 读取 `output/stock-news-sector-tracker/registry/stock-sector-map.csv`

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

### 4. 生成每日扫描报告

报告必须包含以下表格：
1. **消息事件表**：事件、来源、可信度、影响板块、发生时间、是否已反应
2. **板块响应表**：板块、ETF、涨幅、龙头、中军、后排、状态、强度评分
3. **个股联动表**：个股、代码、板块、涨幅、涨停时间、封单、关联事件、逻辑档位、状态
4. **机会评分表**：板块、机会、状态、评分、最佳买点、当前风险
5. **次日观察清单**：标的、观察点、触发条件、应对策略
6. **持仓联动**：结合当前持仓给出提醒

### 5. 生成机会档案（可选）

对重点机会单独建立档案：
- 机会定义
- 消息-板块-个股链路
- 最佳买点复盘
- 后续跟踪
- 教训

### 6. 提交 git

所有文件写入后：
1. `git add .`
2. `git commit -m "消息-板块-个股联动跟踪：{日期} 扫描报告"`
3. `git push origin main`

## 输出模板

见 `references/templates/daily-scan-template.md`。
