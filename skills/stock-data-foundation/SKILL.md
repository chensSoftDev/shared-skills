---
name: stock-data-foundation
description: Use when Codex needs to collect, verify, normalize, or refresh field-level data for A-share stocks, ETFs, portfolio holdings, candidates, daily-review focus names, or knowledge-base cards; create auditable data packets with source priority, AKShare/Eastmoney fallback handling, missing-field treatment, and source logs.
---

# 股票数据基础层

## Role

Build auditable field-level data packets for stock-related skills. This skill collects and verifies raw facts only. Do not produce investment conclusions, buy/sell suggestions, theme rankings, or portfolio actions from this skill.

## Boundaries

- Write runtime data only under `output/stock-data-foundation/`.
- Write packets to `output/stock-data-foundation/packets/YYYY-MM-DD/{code}-{name}.json`.
- Write raw snapshots only when useful under `output/stock-data-foundation/raw/`.
- Append source runs to `output/stock-data-foundation/source-log.csv`.
- Do not directly update portfolio, candidate, daily-review, or knowledge-base outputs. Return the packet path and gaps for those skills to consume.

## References

Read only the files needed for the request:

- `references/akshare-data.md`: AKShare functions, tested behavior, proxy handling, and fallback rules.
- `references/source-priority.md`: source hierarchy and conflict handling.
- `references/stock-field-source-map.md`: common stock fields and required levels.
- `references/etf-field-source-map.md`: ETF fields and required levels.
- `references/data-packet-schema.md`: packet JSON contract.
- `references/fallback-and-quality.md`: statuses, confidence, and business degradation tags.

## Workflow

1. Identify code, name, security type, exchange, target date/time, and scope: `identity`, `quote`, `history`, `announcement`, `financial`, `valuation`, `theme`, `risk`, `local_context`, or `full`.
2. Select the security matrix: stock or ETF.
3. Collect each requested field by source priority. Prefer AKShare for historical OHLCV when the tested functions cover the field; use direct Eastmoney endpoints for realtime quote, funds flow, limit-up pools, and announcements when AKShare wrappers are unstable.
4. For every field, record `value`, `status`, `source`, `source_url`, `as_of`, `confidence`, `fallback_used`, and `notes`. Never write naked values without provenance.
5. If sources conflict, set field `status` to `conflict`, keep all relevant details in `notes`, and do not choose the more convenient value.
6. If a source returns empty data, proxy errors, rate limits, or schema changes, retry at most twice, then fall back. If fallback also fails, mark the field `missing`; do not infer.
7. Generate the packet JSON and append `source-log.csv`.
8. Run `scripts/validate_packet.py <packet.json>` before reporting the packet as usable.
9. Return packet path, packet status, verified/missing/conflict counts, important gaps, and any degradation tags such as `P2-incomplete`, `quote-unavailable`, or `cannot-mark-hard-logic`.

## Data Discipline

- Treat AKShare as an aggregator, not an authority. Record the underlying source when known, for example `AKShare stock_zh_a_daily (Sina)` or `AKShare stock_zh_a_hist_tx (Tencent)`.
- Do not claim AKShare data is "faster and more accurate" universally. State the tested field and function.
- Local portfolio files are trading facts, not company facts.
- Local daily reviews are theme context, not proof of hard logic.
- Announcement APIs returning no rows mean only "this interface returned no rows"; never write "no announcement" unless verified through authoritative disclosure sources.
- ETF packets must use ETF fields. Do not apply stock financial fields such as ROE, PE, or controlling shareholder unless explicitly relevant and marked `not_applicable`.
