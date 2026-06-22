---
name: stock-knowledge-base
description: 当用户要求初始化、创建、更新、查询或批量维护 A 股股票知识库、个股知识卡、P0/P1/P2 分层资料、股票档案索引，或需要给每日复盘、选股、持仓跟踪 Skill 提供个股背景资料和风险标签时使用。
---

# 股票知识库（Stock Knowledge Base）

## 角色

维护一个持续迭代的全 A 股票知识库。知识库沉淀个股事实、主营业务、题材逻辑、财务质量、估值市值、交易特征、重大事件、风险标签、研究结论和跨 Skill 关联。

本 Skill 服务两类对象：

- 用户自己查阅和横向比较股票。
- `stock-daily-review`、`stock-selection`、`stock-portfolio-tracking` 等股票相关 Skill 读取背景资料。

本 Skill 不替代每日复盘、选股或持仓管理，不输出确定性买卖建议。

## 写入边界

- 运行数据只写入 `output/stock-knowledge-base/`。
- 不直接写入 `output/stock-selection/`。
- 不直接写入 `output/stock-portfolio-tracking/`。
- 不直接写入 `output/stock-daily-review/`。
- Skill 源文件位于 `.shared-skills/skills/stock-knowledge-base/`。

## 运行数据

```text
output/stock-knowledge-base/
├── index.csv
├── cards/
└── events/
```

文件职责：

| 文件 | 用途 | 写入规则 |
|------|------|----------|
| `index.csv` | 全市场知识卡索引 | 每次新增、升级、更新股票卡后同步刷新对应行 |
| `cards/{code}-{name}.md` | 单只股票 Markdown 知识卡 | 每只股票一张卡，按固定模板维护 |
| `events/` | 未来结构化事件目录 | 第一版预留；重大事件先写入个股卡第 8 节 |

## 参考文件

- 个股模板：`references/stock-card-template.md`。创建或重建股票卡时必须读取。
- P 级别矩阵：`references/p-level-matrix.md`。判断 P0/P1/P2 必填范围、升级规则和状态规则时必须读取。
- 字段字典：`references/field-dictionary.md`。写入 `index.csv`、frontmatter 元数据区、枚举字段和文件名时必须读取。
- 数据来源规则：`references/data-source-policy.md`。联网核验、标注来源、处理无法确认信息时必须读取。

## 知识等级

使用 P0/P1/P2 三层深度模型：

- `P0`：基础卡。用于全 A 覆盖，回答“这家公司是谁、基本干什么、有没有明显风险”。
- `P1`：研究卡。用于横向比较，回答“有没有研究价值、题材逻辑硬不硬、主要风险是什么”。
- `P2`：深度卡。用于候选、持仓、主线龙头跟踪，回答“什么情况下关注、什么情况下证伪”。

## 整理优先级

每次批量整理时按以下顺序处理：

1. 持仓股：读取 `output/stock-portfolio-tracking/portfolio.csv`，直接做到或更新到 P2。
2. 活跃候选股：读取 `output/stock-selection/candidates/candidates-active.csv`，至少做到 P1，重点候选做到 P2。
3. 每日复盘核心股：读取 `output/stock-daily-review/reports/` 和观察池，涨停核心股、主线龙头至少做到 P1，核心龙头做到 P2。
4. 用户指定热门题材核心股：做到 P1；核心龙头可做到 P2。
5. 行业龙头、指数权重、高辨识度股票：做到 P1。
6. 其余全 A 股票：分批补 P0。

不要按代码顺序一开始深挖所有股票。先铺 P0 覆盖，再让持仓、候选、复盘、题材触发升级。

## 单只股票工作流

1. 明确目标股票和目标等级：P0、P1 或 P2。用户未指定时，按优先级和场景判断。
2. 调用或读取 `stock-data-foundation` data packet。普通股票 P1/P2 必须至少包含身份、主营、财务、估值、交易、公告、风险字段；ETF P1/P2 必须使用 ETF 字段矩阵。
3. 若 data packet 为 `partial`，继续生成或更新卡片，但 frontmatter 和第 10 节必须标注 `P2-incomplete` 及缺口清单。
4. 读取 `references/stock-card-template.md`、`references/p-level-matrix.md`、`references/field-dictionary.md`。
5. 读取 `references/data-source-policy.md`，按目标等级确定所需核验强度。
6. 查询或核验股票身份：代码、名称、交易所、板块、行业。
7. 检查特殊状态：ST、停牌、退市风险、次新、监管异常。
8. 若已有卡片，读取旧卡；若没有，按模板新建。
9. 按目标等级补全字段。无法确认的信息写 `待核验`，不能猜。
10. 写明 `data_as_of`、`last_reviewed` 和来源。
11. 更新或追加重大事件流水。不要覆盖旧事件。
12. 更新 `index.csv` 对应行。
13. 输出本次更新摘要：新增、升级、风险变化、待核验项。

## 批量工作流

支持以下批量入口：

- 初始化知识库目录和 `index.csv`。
- 把持仓股升级成 P2。
- 把候选库股票补成 P1。
- 基于每日复盘核心股更新知识库。
- 按指定题材整理一批 P1 股票。
- 检查 `stale`、`high`、`forbidden` 股票。
- 分批补全全市场 P0。

批量执行时应限制单次范围。若股票数量较多，先输出待处理队列和建议批次，不一次性深挖全部股票。

## 升级与状态规则

- 新持仓：立即升级到 P2。
- 新加入候选库：至少升级到 P1。
- 每日复盘主线龙头：升级到 P1 或 P2。
- 出现重大公告、监管问询、业绩预告、重组、订单、中标：已有卡必须更新事件流水。
- P0 股票连续多次出现在复盘、候选或题材扫描中：升级到 P1。
- P1 股票进入持仓或成为重点候选：升级到 P2。
- 不物理降级，使用 `status` 表示有效性：`active`、`stale`、`archived`、`forbidden`。

## 跨 Skill 联动

`stock-daily-review` 可读取知识库辅助判断涨停股逻辑强度、复用主营和风险信息，并触发核心股更新。

`stock-selection` 可读取知识库排除 `forbidden` 股票、优先考虑低风险 P1/P2 股票，并在候选验证时引用多空逻辑和风险标签。

`stock-portfolio-tracking` 可读取知识库补充持仓背景、证伪条件和风险标签。新买入股票应触发 P2 卡片更新。

## 输出要求

每次执行后输出：

- 本次处理范围。
- 新增股票卡数量。
- 升级股票卡数量。
- 风险等级变化。
- 无法核验字段。
- 写入或更新的文件路径。

如果没有写入文件，明确说明原因。

## 数据纪律

- P0 可使用可靠基础资料源。
- P1/P2 必须联网核验最新行情、公告、财报或可信资讯。
- 关键结论必须写来源。
- 市场传闻不能写成事实。
- 过期信息必须标注 `stale` 或 `待核验`。
- 分析结论必须区分事实、推断、主观判断。
