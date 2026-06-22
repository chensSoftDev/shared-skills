# Data Packet Schema

## 顶层结构

- `meta`：证券和采集元信息。
- `fields`：字段字典，key 使用 `group.field`。
- `gaps`：缺口列表。
- `source_summary`：来源摘要。

## 必填 meta

- `code`
- `name`
- `security_type`：`stock` / `etf` / `index` / `convertible` / `unknown`
- `exchange`：`SH` / `SZ` / `BJ` / `unknown`
- `requested_scope`
- `packet_status`：`complete` / `partial` / `failed`
- `created_at`
- `data_as_of`
- `producer`

## 必填 field 属性

- `value`
- `status`
- `source`
- `source_url`
- `as_of`
- `confidence`
- `fallback_used`
- `notes`

## gaps 属性

- `field`
- `required_for`
- `impact`
- `next_source`

## 示例

```json
{
  "meta": {
    "code": "000960",
    "name": "锡业股份",
    "security_type": "stock",
    "exchange": "SZ",
    "requested_scope": "P2",
    "packet_status": "partial",
    "created_at": "2026-06-22T20:30:00+08:00",
    "data_as_of": "2026-06-22",
    "producer": "stock-data-foundation"
  },
  "fields": {
    "identity.name": {
      "value": "锡业股份",
      "status": "verified",
      "source": "东方财富行情页",
      "source_url": "https://quote.eastmoney.com/sz000960.html",
      "as_of": "2026-06-22",
      "confidence": "high",
      "fallback_used": false,
      "notes": ""
    }
  },
  "gaps": [],
  "source_summary": []
}
```
