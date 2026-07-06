# 来源优先级

## Stocks

1. Exchange disclosures, exchange market data, CNINFO, and company announcements.
2. Periodic reports, earnings previews, equity-change announcements, inquiry letters, and abnormal-volatility announcements.
3. AKShare historical OHLCV functions when tested for the requested field; record the underlying source such as Sina or Tencent.
4. Direct Eastmoney, Tonghuashun, Securities Times, Cailianshe, and other traceable market/news pages.
5. Company websites, investor-relations files, Hudongyi, and SSE e-interaction.
6. Local portfolio, candidate, daily-review, and knowledge-base outputs. These are local context only.

## ETFs

1. Fund contracts, prospectuses, periodic reports, fund-company announcements.
2. Exchange ETF quote, NAV, premium/discount, and volume data.
3. AKShare ETF historical OHLCV functions when tested for the requested field.
4. Tiantian Fund, Eastmoney fund pages, and fund-company websites.
5. Local portfolio, candidate, daily-review, and knowledge-base outputs as local context only.

## Conflict Handling

- Authoritative disclosures override market websites for company/fund facts.
- Same-level conflicts must be recorded as `conflict`.
- Do not select a source because it makes an analysis conclusion look cleaner.
- Keep source URLs or function names in the field record.
