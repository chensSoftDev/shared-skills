# AKShare 数据源参考

## Tested Environment

- Tested version: `akshare 1.18.64`.
- Test date: 2026-06-23.
- Temporary environment: `/tmp/akshare-test`.
- In this environment, `http_proxy`, `https_proxy`, and `all_proxy` pointed to `127.0.0.1:7890`; AKShare calls using requests may fail with `ProxyError` unless proxies are disabled or bypassed.

## Preferred Uses

Use AKShare first for historical daily OHLCV when it returns stable tabular data:

| Security | Function | Example | Result | Notes |
|---|---|---|---|---|
| A-share stock | `stock_zh_a_daily` | `ak.stock_zh_a_daily(symbol="sz000960", start_date="20260615", end_date="20260623", adjust="")` | OK, 3.80s, 6 rows | Sina source; fields include `date/open/high/low/close/volume/amount/outstanding_share/turnover`. |
| A-share stock fallback | `stock_zh_a_hist_tx` | `ak.stock_zh_a_hist_tx(symbol="sz000960", start_date="20260615", end_date="20260623", adjust="")` | OK, 0.74s, 6 rows | Tencent source; fewer fields. Its `amount` column behaved like volume/lot count in the test, so map conservatively. |
| ETF | `fund_etf_hist_sina` | `ak.fund_etf_hist_sina(symbol="sh588170")` | OK, 0.22s, recent rows available | Sina source; fields include `date/open/high/low/close/volume/amount`. |

## Functions To Treat As Optional

The following AKShare functions are useful in normal environments but failed in this environment during testing because their Eastmoney requests were rejected, proxied, or disconnected:

- `stock_zh_a_hist(symbol="000960", period="daily", start_date="20260615", end_date="20260623", adjust="")`
- `stock_individual_info_em(symbol="000960")`
- `stock_zh_a_spot_em()`
- `fund_etf_hist_em(symbol="588170", period="daily", start_date="20260615", end_date="20260623", adjust="")`

When these fail, use direct Eastmoney endpoints from the portfolio/daily-review references, or use AKShare Sina/Tencent functions if the requested field is historical OHLCV.

## Proxy Handling

Before calling AKShare in environments with a broken local proxy, clear proxy env vars in the command:

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy python script.py
```

If Python `requests` still uses a proxy, create a session with `trust_env=False` for direct endpoint checks. Do not monkeypatch production scripts unless the user accepts that environment-specific workaround.

## Field Mapping

For `stock_zh_a_daily`:

| Packet field | AKShare column | Status |
|---|---|---|
| `history.daily[].date` | `date` | verified |
| `history.daily[].open` | `open` | verified |
| `history.daily[].high` | `high` | verified |
| `history.daily[].low` | `low` | verified |
| `history.daily[].close` | `close` | verified |
| `history.daily[].volume` | `volume` | verified |
| `history.daily[].amount` | `amount` | verified |
| `history.daily[].turnover` | `turnover` | verified |

For `fund_etf_hist_sina`, map `date/open/high/low/close/volume/amount` directly and mark turnover, premium/discount, holdings, and tracking error as `missing` unless collected from ETF-specific sources.
