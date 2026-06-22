# fallback 与质量规则

## 字段状态

- `verified`：至少一个可靠来源核验，字段可用于结论。
- `cross_checked`：两个及以上来源一致，优先用于 P2。
- `derived`：由可靠字段计算得出，例如持仓盈亏、均线、涨跌幅区间。
- `user_provided`：来自用户或本地事实源，例如持仓成本、买入逻辑。
- `not_applicable`：证券类型不适用，例如 ETF 的 ROE、商誉。
- `missing`：应取但没有取到。
- `conflict`：来源冲突，必须保留冲突来源，业务 Skill 不得直接下结论。

## 置信度

- `high`：权威来源或两个来源一致。
- `medium`：单个可信行情/资讯源。
- `low`：来源可用但口径不完整。
- `unknown`：字段缺失或冲突。

## 业务降级

- 普通股票 P2 缺财务、估值、主营、公告任一组：`P2-incomplete`。
- ETF P2 缺跟踪指数、持仓、规模、折溢价任一组：`P2-incomplete`。
- 题材依据只有本地复盘：`cannot-mark-hard-logic`。
- 行情字段缺失：`quote-unavailable`。
- 公告接口未返回：写 `announcement-interface-no-result`，不能写“无公告”。
- 来源冲突：写 `source-conflict`，业务结论降一级。

## fallback 规则

1. 首选来源成功时，不再使用备用来源覆盖字段；可使用备用来源做交叉核验。
2. 首选来源失败时，才使用备用来源，并将 `fallback_used` 写为 `true`。
3. 备用来源仍失败时，字段写 `missing`，`confidence` 写 `unknown`。
4. 用户提供的数据只能作为 `user_provided`，不能伪装成联网核验数据。
5. 本地持仓和复盘可以作为上下文，但不能作为公司财务、公告、股权结构的事实来源。

## Packet 状态判定

- `complete`：目标等级必填字段均为 `verified`、`cross_checked`、`derived`、`user_provided` 或 `not_applicable`。
- `partial`：有必填字段为 `missing`，但核心身份和当前行情可用。
- `failed`：代码、名称、证券类型或交易状态无法确认。
