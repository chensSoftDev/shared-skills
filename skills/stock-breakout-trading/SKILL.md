---
name: stock-breakout-trading
description: 当用户希望采用"突破交易"策略做A股短线，需要识别真突破、筛选突破候选股、制定买点/止损/止盈/仓位规则，并跟踪突破后的持仓管理时使用。
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [a-share, breakout, short-term-trading, stock-selection, risk-control]
    related_skills: [stock-selection, stock-portfolio-tracking, stock-daily-review]
---

# 突破交易（Breakout Trading）

## 角色

本Skill负责将用户的"突破交易"需求转化为可执行的A股短线交易系统，包括：
1. 定义什么是真突破、假突破和突破陷阱
2. 筛选当日符合突破条件的候选股
3. 对候选股进行买点、止损、止盈、仓位规划
4. 将交易计划写入持仓跟踪系统（portfolio.csv / trade-log.csv / checks/）
5. 对已有突破仓位进行跟踪、加仓、减仓或清仓决策

## 约束

### 选股范围
- 只选A股主板/创业板/科创板股票，不选ST、*ST、退市整理期股票
- 流通市值50-500亿为最佳，过小流动性差，过大弹性差
- 不选已经连续涨停或涨幅>9%的标的（避免追高）

### 突破条件（必须同时满足）
1. **价格突破**：收盘价创5日或10日新高，或放量突破近期整理平台上沿
2. **成交量放大**：突破当日成交量 >= 5日均量 × 1.5，量比 >= 1.5
3. **板块配合**：所属概念/板块当日涨幅排名前10，或有明确题材催化
4. **多头排列**：收盘价 > MA5，MA5 > MA10（或MA5拐头向上）
5. **风险过滤**：排除当日长上影线（上影线长度 > 实体2倍）、排除高位放巨量阴线

### 买点规则
- **确认买点**：突破当日尾盘14:45-14:55，确认收盘能站稳突破位，仓位30-50%
- **回踩买点**：突破后次日/第三日回踩MA5或突破位，缩量止跌，仓位40-60%
- **不追涨**：涨幅>7%且未涨停的，等回落或次日
- **不隔夜追一字板**：一字板不参与，等开板看承接

### 止损规则
- 买入次日跌破突破位或MA5，开盘直接止损
- 收盘跌破突破位或MA5，无条件减仓/清仓
- 单笔亏损控制在-5%到-7%以内
- 3日内不涨反跌，触发时间止损

### 止盈规则
- 浮盈+5%：将止损上移至成本价，保护本金
- 浮盈+10%：减半仓，留一半
- 浮盈+15%以上：再减一半，剩余1/4跟踪止盈
- 跌破日内均线或MA5：清仓

### 仓位管理
- 单只突破股仓位不超过总资金的20%
- 同板块突破股合计仓位不超过总资金的40%
- 大盘情绪差（科创50跌幅>2%）时，仓位减半

### 数据与记录
- 每次突破交易必须写入 `output/stock-portfolio-tracking/trade-log.csv`
- 更新 `output/stock-portfolio-tracking/portfolio.csv`
- 生成 `output/stock-portfolio-tracking/checks/YYYY-MM-DD-HHMM.md` 快照
- 交易完成后 `git add / commit / push`

## 上下文

### 相关文件路径

**Skill源文件**（在 `.shared-skills/skills/stock-breakout-trading/`）：
```
SKILL.md                              # 本文件
references/
  ├── breakout-patterns.md            # 常见突破形态定义
  ├── screening-criteria.md           # 可量化筛选条件清单
  ├── buy-stop-target-rules.md        # 买点/止损/止盈规则速查
  └── trade-record-template.md        # 交易记录模板
```

**运行数据文件**（在 `output/stock-portfolio-tracking/` 和 `output/stock-selection/`）：
```
output/stock-portfolio-tracking/
  ├── portfolio.csv                   # 当前持仓事实源
  ├── trade-log.csv                   # 交易流水
  ├── check-log.csv                   # 体检摘要
  └── checks/                         # 持仓快照

output/stock-selection/
  ├── daily-screens/                  # 日筛选报告
  ├── candidates/
  │   ├── candidates-active.csv       # 活跃候选库
  │   └── candidates-history.csv      # 历史候选
  └── validation-reports/             # 验证报告
```

### 配置参数

参见 `.agents/skills-config.json` 中的 `stockBreakoutTrading` 配置（如存在）：
```json
"stockBreakoutTrading": {
  "portfolioPath": "output/stock-portfolio-tracking/portfolio.csv",
  "tradeLogPath": "output/stock-portfolio-tracking/trade-log.csv",
  "checkLogPath": "output/stock-portfolio-tracking/check-log.csv",
  "checksDir": "output/stock-portfolio-tracking/checks",
  "screenReportDir": "output/stock-selection/daily-screens",
  "candidatesActivePath": "output/stock-selection/candidates/candidates-active.csv"
}
```

### 数据源

- **实时行情**：腾讯 `qt.gtimg.cn`、东方财富 `push2.eastmoney.com` / `push2delay.eastmoney.com`
- **K线数据**：新浪60分钟K线聚合日K、东方财富K线接口
- **板块数据**：东方财富板块行情、腾讯批量行情

## 工作流

### 场景 1：筛选今日突破候选股

**触发条件**：用户要求"帮我筛选今天突破的股票"或"按突破策略选股"

**流程**：

1. **读取持仓和候选库**
   - 读取 `output/stock-portfolio-tracking/portfolio.csv`，记录当前持仓代码
   - 读取 `output/stock-selection/candidates/candidates-active.csv`，避免重复

2. **采集全市场数据**
   - 获取当日沪深京全市场股票实时行情
   - 计算涨跌幅、成交量、量比、MA5/MA10、5日/10日高点

3. **套用突破条件筛选**
   - 涨幅 3%-8%（排除一字板和已涨停）
   - 收盘价 >= 5日高点 × 0.995（近似创5日新高）
   - 成交量 >= 5日均量 × 1.5
   - 量比 >= 1.5
   - 收盘价 > MA5 且 MA5 > MA10（或MA5拐头向上）
   - 上影线长度 <= 实体长度 × 2
   - 流通市值50-500亿

4. **获取板块强度**
   - 统计每个候选股所属概念的当日涨幅
   - 只保留所属板块排名前10或板块涨幅>2%的标的

5. **打分排序**
   - 按"板块强度 + 量能放大 + 趋势强度 + 估值合理性"综合评分
   - 输出Top10-15候选

6. **生成报告和候选库**
   - 输出 `output/stock-selection/daily-screens/YYYY-MM-DD/screen-breakout.csv`
   - 输出 `output/stock-selection/daily-screens/YYYY-MM-DD/screen-breakout-report.md`
   - 将新候选追加写入 `candidates-active.csv`（状态：观察中）

7. **向用户汇报**
   - 列出Top5候选，包含：代码、名称、现价、涨幅、成交额、量比、突破类型、买点、止损、目标、评分、风险

**输出文件**：
```
output/stock-selection/daily-screens/YYYY-MM-DD/
├── screen-breakout.csv
└── screen-breakout-report.md
```

---

### 场景 2：对指定股票做突破交易计划

**触发条件**：用户提交"XXX股票能不能做突破"或"帮我制定XXX的突破交易计划"

**流程**：

1. **获取标的实时数据**
   - 现价、涨幅、成交量、量比、MA5/MA10/MA20
   - 5日/10日/20日高低点
   - 所属板块强度

2. **判断是否符合突破条件**
   - 按"约束"中的突破条件逐项检查
   - 标注每一项：✅满足 / ⚠️边缘 / ❌不满足

3. **确定突破类型**
   - 平台突破：横盘整理后突破
   - 新高突破：创5日/10日新高
   - 均线突破：放量站上MA5/MA10/MA20
   - 缺口突破：跳空高开突破

4. **制定交易计划**
   - 买点：确认买点 / 回踩买点
   - 止损位：突破位下方3%-5% 或 MA5/MA10
   - 目标位：近期高点 / 1.05-1.1倍突破位
   - 仓位：10%-20%（根据评分和风险调整）
   - 买入触发条件：盘中突破并站稳 / 尾盘确认 / 次日回踩缩量止跌

5. **输出突破交易计划报告**
   - 输出 `output/stock-selection/validation-reports/YYYY-MM-DD-HHMM-breakout-plan-<code>.md`

6. **询问用户是否执行买入**
   - 若用户确认买入，调用 `stock-portfolio-tracking` 流程更新持仓文件

**输出文件**：
```
output/stock-selection/validation-reports/
└── YYYY-MM-DD-HHMM-breakout-plan-<code>.md
```

---

### 场景 3：执行突破买入并记录

**触发条件**：用户说"买入XXX"或"按计划在XX元买入XXX"

**流程**：

1. **确认交易要素**
   - 代码、名称、买入价、数量、总金额
   - 估算费用（佣金+过户费，买入无印花税）
   - 计算成本价

2. **检查可用资金**
   - 从 `portfolio.csv` 的账户行读取可用资金
   - 确保买入后不会透支

3. **更新持仓文件**
   - 写入/更新 `portfolio.csv` 中的持仓行
   - 更新账户行可用资金、总资产、持仓说明
   - 写入 `trade-log.csv` 买入记录

4. **生成快照**
   - 生成 `output/stock-portfolio-tracking/checks/YYYY-MM-DD-HHMM.md`
   - 记录买入理由、成本、止损、目标、仓位占比

5. **Git同步**
   - `git add` 相关文件
   - `git commit -m "突破交易: 买入XXX @xx.xx"`
   - `git push`

6. **向用户确认**
   - 汇报买入成本、剩余资金、止损位、目标位

---

### 场景 4：跟踪已有突破仓位

**触发条件**：用户要求"跟踪持仓"或"我的突破股要不要卖"

**流程**：

1. **读取当前持仓**
   - 从 `portfolio.csv` 获取所有持仓
   - 筛选出突破交易风格的持仓（style=短线 且 logic含"突破"）

2. **刷新实时行情**
   - 获取持仓股的最新价格、涨跌幅、成交量、MA5/MA10

3. **判断触发条件**
   - 触发止损：价格跌破止损位 → 建议清仓
   - 触发止盈：价格达到目标位或跌破MA5 → 建议减仓/清仓
   - 触发加仓：突破后回踩MA5缩量止跌，且板块仍强 → 建议加仓
   - 触发保本：浮盈+5%以上，将止损上移至成本价

4. **生成体检快照**
   - 输出 `output/stock-portfolio-tracking/checks/YYYY-MM-DD-HHMM.md`

5. **向用户汇报**
   - 每只持仓的当前状态、建议操作、关键价位

---

### 场景 5：周末/盘后突破交易复盘

**触发条件**：用户要求"复盘本周突破交易"或"总结突破策略效果"

**流程**：

1. **读取交易日志**
   - 从 `trade-log.csv` 筛选出突破交易记录（action含buy/sell且reason含"突破"）

2. **统计指标**
   - 总交易次数、胜率、平均盈亏、最大单笔盈利/亏损
   - 突破类型胜率分布（平台/新高/均线/缺口）
   - 买点类型胜率（确认买点 vs 回踩买点）

3. **输出复盘报告**
   - 输出 `output/stock-selection/validation-reports/YYYY-MM-DD-breakout-review.md`
   - 总结有效模式、失败教训、改进建议

4. **更新策略参数**
   - 根据复盘结果调整筛选阈值或仓位建议

## 输入输出

### 输入

1. 用户指令："筛选突破股" / "做XXX的突破计划" / "买入XXX" / "跟踪突破持仓" / "复盘突破交易"
2. 股票代码或候选列表
3. 当前持仓数据（portfolio.csv）
4. 实时行情数据

### 输出

1. **筛选报告**：`screen-breakout-report.md` + `screen-breakout.csv`
2. **交易计划**：`breakout-plan-<code>.md`
3. **持仓快照**：`checks/YYYY-MM-DD-HHMM.md`
4. **复盘报告**：`breakout-review.md`
5. 更新后的 `portfolio.csv`、`trade-log.csv`、`candidates-active.csv`

## 常见错误

1. **把假突破当真突破**：只看盘中价格刺破，不看收盘是否站稳，不看成交量
2. **追高买入**：涨幅>7%还追，次日容易低开被套
3. **不设止损**：突破失败时犹豫，亏损扩大
4. **重仓单票**：单只股票仓位过重，一次失败重伤
5. **忽视大盘**：大盘暴跌时做突破，成功率大幅下降
6. **忽视板块**：个股突破但板块不配合，容易独木难支
7. **用下降趋势线突破当买点**：下降趋势线突破只是止跌，不是反转，成功率低

## 自检清单

- [ ] 选股条件全部满足：价格突破、放量、板块配合、多头排列
- [ ] 已排除ST、连续涨停、高位巨量、长上影线标的
- [ ] 已对比当前持仓，避免重复
- [ ] 交易计划包含：买点、止损、目标、仓位
- [ ] 买入后已更新 portfolio.csv、trade-log.csv、生成快照
- [ ] 止损位已明确，且单笔亏损控制在-5%到-7%
- [ ] 交易完成后已 git add / commit / push
- [ ] 向用户明确汇报：成本、仓位、止损、目标、风险
