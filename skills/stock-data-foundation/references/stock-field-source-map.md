# 普通股票字段矩阵

| Field group | Fields | P0 | P1 | P2 | Preferred sources | Fallback | Missing treatment |
|---|---|---:|---:|---:|---|---|---|
| identity | code, name, exchange, board, listing date | yes | yes | yes | exchange, CNINFO, company announcement | Eastmoney/Tonghuashun F10 | missing identity makes packet `failed` |
| industry | industry, concept tags | yes | yes | yes | exchange industry, Shenwan/CITIC if available | Eastmoney/Tonghuashun industry | mark source口径 |
| special status | ST, suspension, delisting risk, abnormal move | yes | yes | yes | exchange status and announcements | market risk提示 | missing -> `unknown-risk-status` |
| business | main business, product, revenue structure | no | yes | yes | annual/interim reports | F10, company website | cannot mark hard logic |
| financial | revenue, net profit, deduct net profit, gross margin, ROE, cash flow, debt ratio | no | yes | yes | periodic reports | Eastmoney/Tonghuashun finance | `P2-incomplete` |
| valuation | market cap, float cap, PE, PB, PS | no | yes | yes | quote APIs, terminal data | Eastmoney quote page | `P2-incomplete` |
| history | daily OHLCV, turnover, MA fields | yes | yes | yes | AKShare `stock_zh_a_daily` | AKShare Tencent fallback, direct Eastmoney kline | `quote-unavailable` |
| realtime quote | price, change pct, high, low, open, previous close, volume, amount, turnover, volume ratio | no | yes | yes | direct Eastmoney quote API | terminal/user observation marked as such | `quote-unavailable` |
| funds flow | main, super-large, large, medium, small orders;龙虎榜 | no | no | yes | Eastmoney funds flow, exchange龙虎榜 | user observation | mark `missing` if unavailable |
| announcements | latest announcements, reduction, inquiry, restructuring, earnings | no | yes | yes | exchange/CNINFO | Eastmoney announcement API | interface empty != no announcement |
| theme | catalyst evidence, local review linkage | no | yes | yes | announcements, reports, verified news | local daily review | local-only -> `cannot-mark-hard-logic` |
| local context | portfolio, candidate, daily-review links | no | no | yes | repository output facts | none | `not_applicable` or `missing` |
