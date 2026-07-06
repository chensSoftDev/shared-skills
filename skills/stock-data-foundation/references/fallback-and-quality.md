# fallback 与质量规则

## Field Status

- `verified`: one reliable source verifies the field.
- `cross_checked`: two or more independent sources agree.
- `derived`: calculated from reliable fields.
- `user_provided`: user or local fact source supplied it.
- `not_applicable`: field does not apply to this security type.
- `missing`: expected field could not be collected.
- `conflict`: sources disagree.

## Confidence

- `high`: authoritative source or multiple sources agree.
- `medium`: single credible market/news source.
- `low`: usable but incomplete or weak source.
- `unknown`: missing or conflicting.

## Degradation Tags

- `P2-incomplete`: P2 required fields are missing.
- `cannot-mark-hard-logic`: theme evidence is local-only or unverified.
- `quote-unavailable`: quote/history fields are unavailable.
- `announcement-interface-no-result`: a non-authoritative announcement API returned no rows.
- `source-conflict`: field status is `conflict`.

## Retry And Fallback

- Retry network failures at most twice.
- If AKShare Eastmoney wrappers fail, try AKShare Sina/Tencent historical functions for OHLCV or direct Eastmoney endpoints for realtime/funds/announcements.
- If only user observation is available, set `status=user_provided`, `confidence=low` or `medium`, and state that it is not independently verified.
