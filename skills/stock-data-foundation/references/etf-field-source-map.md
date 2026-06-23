# ETF 字段矩阵

| Field group | Fields | P0 | P1 | P2 | Preferred sources | Fallback | Missing treatment |
|---|---|---:|---:|---:|---|---|---|
| identity | code, name, exchange, security type | yes | yes | yes | exchange, fund announcements | Tiantian Fund, Eastmoney fund page | missing identity makes packet `failed` |
| management | fund manager, custodian, fund managers | no | yes | yes | fund contract, prospectus, fund reports | fund company website, Tiantian Fund | `P2-incomplete` |
| tracking | tracking index, index provider | yes | yes | yes | prospectus, fund contract | fund page | missing tracking index blocks ETF logic |
| fees | management fee, custodian fee, subscription/redemption fees | no | no | yes | prospectus, fund detail page | Tiantian Fund | missing does not block intraday check |
| scale | fund scale, shares change, holder structure | no | yes | yes | periodic reports | fund page | `P2-incomplete` |
| holdings | top holdings, stock position, sector exposure | no | yes | yes | periodic reports | fund page | cannot judge theme exposure |
| NAV returns | NAV, recent returns | no | yes | yes | fund company, Tiantian Fund | Eastmoney fund page | mark `missing` |
| market history | daily OHLCV | yes | yes | yes | AKShare `fund_etf_hist_sina` | exchange/Eastmoney ETF quote | `quote-unavailable` |
| market quote | price, change pct, volume, amount, premium/discount | no | yes | yes | exchange quote data | Eastmoney quote/fund page | `quote-unavailable` |
| tracking quality | tracking error, premium/discount, liquidity | no | no | yes | periodic reports, exchange quote | fund page | list as ETF risk gap |
| local context | portfolio, candidate, daily-review links | no | no | yes | repository output facts | none | `not_applicable` or `missing` |
