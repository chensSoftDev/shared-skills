---
name: stock-selection
description: Use when 用户要求从全市场筛选股票、验证买入逻辑、评估候选标的风险、维护候选库或与复盘联动选股。
---

# A股选股（Stock Selection）

## 角色（Role）

作为投资决策链中的"发现"环节，本Skill负责：
1. 基于多维度筛选从全市场发现符合条件的候选标的
2. 对候选标的进行买入逻辑的完整性验证
3. 配合"A股每日复盘"进行题材驱动的深度筛选
4. 提供全面的风险评估和风控建议
5. 维护候选库的生命周期管理和持续监控

## 约束（Constraints）

### 数据完整性
- ✅ **候选库唯一事实源**：`candidates-active.csv` 是当前候选库的唯一事实源，记录最新状态、价格、评分
- ✅ **历史数据追加**：`candidates-history.csv` 只追加已成交（买入/卖出）、已禁入、已过期的标的，不修改
- ✅ **每次操作可追溯**：所有选股/验证操作都输出详细的报告，支持完整回溯
- ✅ **与持仓无重复**：选股发现的候选标的不与当前持仓中的标的重复

### 筛选和验证
- ✅ **数据联网核验**：筛选操作必须基于实时或最新数据，不使用过期/本地缓存数据
- ✅ **逻辑验证标准化**：所有候选标的必须通过"买入逻辑验证清单"的关键项检查
- ✅ **风险优先**：任何风险等级 ≥ 中等的标的必须：
  - 标注具体风险原因
  - 列举风控建议或禁入条件
  - 如为"观察中"状态，需注明何时/如何解除风险
- ✅ **禁入规则明确**：定义硬性禁入条件（如涉及违规、财务异常等），与"风险提示"区分

### 数据写入规则
- ✅ **candidates-active.csv**：每次更新时写入最新数据，保持汇总表的准确性
- ✅ **daily-screens/报告**：每次日筛选操作输出一个日期文件夹（格式：YYYY-MM-DD），包含筛选CSV和Markdown报告
- ✅ **validation-reports/**：逻辑验证报告按时间戳命名（格式：YYYY-MM-DD-HHMM-validation-batch1.md）
- ✅ **check-log.csv**（可选）：追加候选库体检摘要（类似持仓跟踪的体检记录）

### 与其他Skill的联动
- ✅ **复盘联动**：基于"A股每日复盘"的涨停池和题材分类，进行深度筛选；复盘报告和选股报告应相互引用
- ✅ **持仓关联**：选股时应对比当前持仓（读取 portfolio.csv），确保不重复；持仓体检时可对比候选库
- ✅ **独立存在**：选股也支持独立的日常筛选场景，不强制依赖复盘和持仓跟踪

## 上下文（Context）

### 相关文件路径

**Skill源文件**（在 `.shared-skills/skills/stock-selection/`）：
```
SKILL.md                              # 本文件
references/
  ├── screening-framework.md          # 筛选维度和条件定义
  ├── logic-validation-checklist.md   # 买入逻辑验证清单
  ├── risk-control-guide.md           # 风控指标和评分模型
  └── selection-data-format.md        # 数据格式和字段说明
examples/
  ├── example-daily-screening.md      # 日常全市场筛选示例
  └── example-review-integration.md   # 复盘联动筛选示例
agents/
  ├── screening-logic-agent.md        # 筛选逻辑应用指南（可选）
  └── validation-agent.md             # 逻辑验证流程指南（可选）
```

**运行数据文件**（在 `output/stock-selection/`）：
```
README.md                             # 输出目录说明
daily-screens/                        # 日筛选结果
  ├── 2026-06-16/
  │   ├── screen-full-market.csv      # 全市场筛选CSV
  │   ├── screen-theme-driven.csv     # 题材筛选CSV（如有）
  │   └── screen-report-2026-06-16.md # 当日筛选报告
  └── 2026-06-15/
      └── ...
candidates/
  ├── candidates-active.csv           # 当前活跃候选库（事实源）
  ├── candidates-history.csv          # 历史候选标的
  └── check-log.csv                   # 候选池体检记录（可选）
validation-reports/
  ├── 2026-06-16-1430-validation-batch1.md
  └── ...
watchlist-index.csv                   # 全局候选标的索引（可选聚合）
```

### 配置参数

参见 `.agents/skills-config.json` 中的 `stockSelection` 配置：
```json
"stockSelection": {
  "candidatesActivePath": "output/stock-selection/candidates/candidates-active.csv",
  "candidatesHistoryPath": "output/stock-selection/candidates/candidates-history.csv",
  "checkLogPath": "output/stock-selection/candidates/check-log.csv",
  "screenReportDir": "output/stock-selection/daily-screens",
  "validationReportDir": "output/stock-selection/validation-reports"
}
```

### 数据源说明

- **行情数据**：基于实时或盘后数据源（Tushare/Wind/自有接口等），确保数据时效性
- **复盘报告**：`output/stock-daily-review/reports/YYYY-MM-DD.md`（若需联动）
- **持仓数据**：`output/stock-portfolio-tracking/portfolio.csv`（若需对比）

## 工作流（Workflow）

### 场景 1：日常全市场筛选

**触发条件**：用户要求"今天帮我筛一遍全市场，找符合XXX条件的标的"

**流程**：

1. **接收筛选条件**
   - 用户指定筛选维度（技术面/基本面/题材面/风险面等）和参数
   - 若无特定条件，可使用预设模板

2. **数据采集**
   - 获取沪深京三市完整股票列表
   - 拉取行情数据、基本面数据（估值、成长性等）、技术指标

3. **初步筛选**
   - 套用用户指定的筛选条件和参数
   - 排除明显违反"禁入规则"的标的

4. **排序和候选池生成**
   - 对筛选结果进行排序（如按涨幅、成交量、技术评分等）
   - 生成候选标的池（CSV格式）

5. **快速逻辑检查**
   - 对每个候选进行"买入逻辑快速检查"（基于logic-validation-checklist中的核心项）
   - 标注每只标的的逻辑完整性状态（✅完整/⚠️缺陷/❌不满足）

6. **风险评估**
   - 为每只标的计算风险等级（低/中/高）
   - 标注风险原因和建议止损位

7. **输出和确认**
   - 输出筛选报告（Markdown）+ 候选清单（CSV）
   - 询问用户是否需要对高优先级标的进行"逻辑深度验证"

**输出文件**：
```
output/stock-selection/daily-screens/2026-06-16/
├── screen-full-market.csv              # 筛选结果CSV
└── screen-report-2026-06-16.md         # 筛选报告
```

---

### 场景 2：基于复盘的题材深度筛选

**触发条件**：用户执行"A股每日复盘"后，要求"这些新题材里帮我找投资机会"

**流程**：

1. **读取复盘报告**
   - 获取当日复盘中的涨停池、题材分类、催化事件等
   - 识别"新热点"或"强催化"的题材

2. **题材相关标的扩大化筛选**
   - 基于涨停股的题材，扩大到该题材内的相关标的
   - 排除已在持仓库中的标的（对比 portfolio.csv）
   - 排除已在候选库中且已评估过的标的（对比 candidates-active.csv）

3. **逻辑验证和风险评估**
   - 对扩大后的候选进行逻辑验证
   - 计算风控指标和建议止损位

4. **输出和更新**
   - 输出"题材机会报告"（Markdown）和候选清单（CSV）
   - 新增候选标的写入 candidates-active.csv（来源标记为"review-theme"或具体题材名称）
   - 在复盘报告尾部补充"建议进一步追踪的标的"链接

**输出文件**：
```
output/stock-selection/daily-screens/2026-06-16/
├── screen-theme-driven.csv            # 题材筛选结果CSV
└── screen-report-2026-06-16.md        # 包含"复盘联动"标签的报告
```

---

### 场景 3：候选标的逻辑验证（深度）

**触发条件**：用户提交"某支股票XXX（代码：600000），我想加入候选库，帮我验证一下买入逻辑是否完整"

**流程**：

1. **获取标的信息**
   - 查询目标股票的最新行情、基本面数据
   - 用户提供的买入逻辑和理由

2. **对标验证清单**
   - 逐一检查"买入逻辑验证清单"中的关键项
   - 标注每一项的状态（✅满足/⚠️需补充/❌不满足）

3. **完整性诊断**
   - 综合评分：✅完整（所有关键项满足）/ ⚠️缺陷（部分项缺失但可补充）/ ❌不满足条件（硬性条件不符）
   - 针对缺陷项提出改进建议

4. **风险评估**
   - 计算风险等级（低/中/高）
   - 提出建议止损位（%止损或技术位）
   - 标注禁入原因（如有）

5. **输出和决策**
   - 输出逻辑验证报告（Markdown）
   - 如验证通过（✅完整），自动或询问是否加入 candidates-active.csv
   - 如为⚠️缺陷，标记为"观察中"状态，建议补充信息后重新验证
   - 如为❌不满足，建议暂不加入，或标记为"观察中"（待条件改变后重新评估）

**输出文件**：
```
output/stock-selection/validation-reports/
└── 2026-06-16-1430-validation-batch1.md  # 验证报告
```

---

### 场景 4：风险评估和止损建议

**触发条件**：用户查询某个候选标的的风控指标，或需要更新已有候选标的的风控数据

**流程**：

1. **获取目标标的最新数据**
   - 从 candidates-active.csv 中查询该标的
   - 拉取其最新行情数据

2. **计算风控指标**
   - 基于"风控指标体系"计算：波动率、支撑位、压力位、技术风险等
   - 根据买入逻辑类型推荐止损方式（%止损 vs 技术位止损 vs 时间止损）

3. **风险等级评分**
   - 基于风控模型计算风险等级（低/中/高）
   - 列举具体风险信号

4. **输出建议**
   - 建议止损位
   - 建议止盈位（可选）
   - 风险等级和原因
   - 禁入条件（如适用）

5. **更新数据**
   - 若为已有候选标的，更新其在 candidates-active.csv 中的风控数据

---

### 场景 5：候选库定期体检（周末或手动触发）

**触发条件**：用户命令"周末候选库复盘"或"清理过期候选"

**流程**：

1. **读取候选库**
   - 获取 candidates-active.csv 中的所有活跃候选标的

2. **逐只检查**
   - 是否已达止损/止盈价位？
   - 是否有新的风险信号？
   - 逻辑是否仍然有效？（复查初始逻辑前提是否已变化）
   - 距发现日期是否超过N天（定义为"过期"）？

3. **状态更新**
   - 达止损/止盈的标的：转移到 candidates-history.csv，标记为"sold"或"sl"
   - 逻辑失效的标的：转移到 candidates-history.csv，标记为"logic_failed"
   - 过期标的：转移到 candidates-history.csv，标记为"expired"
   - 风险升级的标的：标记为"high_risk"，并更新风控建议
   - 继续持有的标的：保留在 candidates-active.csv，更新价格/评分

4. **输出体检报告**
   - 体检报告（Markdown）类似持仓跟踪的体检报告
   - 包含"待处理标的"、"风险升级标的"、"可继续持观标的"的分类汇总

5. **更新数据文件**
   - 更新 candidates-active.csv
   - 追加转移的标的到 candidates-history.csv
   - 在 check-log.csv 中追加一行体检摘要记录

**输出文件**：
```
output/stock-selection/candidates/
├── candidates-active.csv             # 更新后的活跃候选库
├── candidates-history.csv            # 追加已完成/过期的标的
└── check-log.csv                     # 追加体检摘要
output/stock-selection/validation-reports/
└── 2026-06-16-1600-checkup-report.md # 体检报告
```

---

## 输入 / 输出

### 输入

1. **筛选条件**（日常筛选）
   - 筛选维度：技术面/基本面/题材面/风险面
   - 参数：具体数值范围、指标阈值等
   - 可选池范围：全市场/特定板块/特定题材

2. **复盘报告**（复盘联动）
   - 当日 `output/stock-daily-review/reports/YYYY-MM-DD.md`
   - 提取涨停池、题材分类

3. **用户提交的标的信息**（逻辑验证）
   - 股票代码、名称
   - 用户的买入逻辑和理由

4. **查询请求**（风险评估、体检）
   - 某支候选标的的代码
   - 更新数据的标志

### 输出

1. **筛选报告**（Markdown）
   - 标题：筛选维度、条件、时间
   - 内容：筛选过程、初步结果、逻辑检查要点
   - 附表：候选标的卡片（代码、名称、评分、风险等级等）
   - 建议：是否需要进一步深度验证

2. **筛选CSV**（可导入Excel）
   - 格式见 `references/selection-data-format.md`
   - 字段：代码、名称、行业、现价、涨跌幅、技术评分、基本面评分、风险等级、建议止损位、建议止盈位、逻辑状态、备注

3. **逻辑验证报告**（Markdown）
   - 标的基本信息
   - 验证清单逐项检查结果
   - 完整性诊断总结
   - 风控指标和建议
   - 最终判决（✅加入候选库/⚠️观察中/❌暂不加入）

4. **风控评估报告**（Markdown或简表）
   - 风险等级
   - 建议止损位和止盈位
   - 风险信号列表
   - 风控建议

5. **体检报告**（Markdown）
   - 标题：体检日期、候选库概览
   - 内容：待处理标的、风险升级标的、继续持观标的
   - 建议：后续操作建议

### 数据文件格式

详见 `references/selection-data-format.md` 和各Markdown模板。

---

## 工具与权限

### 所需权限

- ✅ 读取 `output/stock-portfolio-tracking/portfolio.csv`（对比持仓）
- ✅ 读取 `output/stock-daily-review/reports/YYYY-MM-DD.md`（复盘联动）
- ✅ 读写 `output/stock-selection/` 下的所有文件
- ✅ 联网获取实时行情和基本面数据

### 工具集

- **数据获取**：行情API（如Tushare）、财务数据接口
- **文本处理**：Markdown生成、CSV读写
- **计算工具**：技术指标计算、风险评分模型

---

## 自检清单

完成一次选股/验证操作后，检查以下项：

- ✅ 是否输出了详细的操作报告（Markdown）？
- ✅ 是否包含了所有候选标的的风险等级和建议止损位？
- ✅ 是否对比了持仓库，确保无重复？
- ✅ 所有新候选标的是否都写入了 candidates-active.csv？
- ✅ 是否标注了来源（日期、题材、维度等）？
- ✅ 是否对逻辑缺陷的标的标记为"观察中"而不是直接排除？
- ✅ 是否完整地记录了验证过程，支持回溯？
- ✅ 若为复盘联动，是否在复盘报告中补充了链接？

---

## 关键决策和扩展方向

### 当前阶段的边界

1. **候选库生命周期**：发现后14-30天内如未买入自动标为"过期"
2. **执行策略**：不自动执行日筛选，支持手动触发和复盘后可选联动
3. **验证失败处理**：验证失败的标的标记为"观察中"，暂不排除
4. **数据实时性**：每次操作都联网核验实时行情，不使用过期数据

### 后续扩展方向（第三阶段）

- 量化选股维度（引入更多指标体系）
- 自动化日筛选（定时执行，输出晨报）
- 选股回测功能（验证历史筛选效果）
- 与持仓跟踪深度集成（自动建议加仓/减仓）
- Web Dashboard（候选库可视化）

