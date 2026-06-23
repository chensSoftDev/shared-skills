# Data Packet Schema

## Top Level

- `meta`: security and collection metadata.
- `fields`: dictionary keyed by `group.field`.
- `gaps`: missing or incomplete required fields.
- `source_summary`: optional source-level notes.

## Required `meta`

- `code`
- `name`
- `security_type`: `stock`, `etf`, `index`, `convertible`, or `unknown`
- `exchange`: `SH`, `SZ`, `BJ`, or `unknown`
- `requested_scope`
- `packet_status`: `complete`, `partial`, or `failed`
- `created_at`
- `data_as_of`
- `producer`: use `stock-data-foundation`

## Required Field Object

Each field object must include:

- `value`
- `status`
- `source`
- `source_url`
- `as_of`
- `confidence`
- `fallback_used`
- `notes`

## Required Gap Object

Each gap object must include:

- `field`
- `required_for`
- `impact`
- `next_source`
