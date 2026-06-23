#!/usr/bin/env python3
import json
import sys
from pathlib import Path


REQUIRED_META = {
    "code",
    "name",
    "security_type",
    "exchange",
    "requested_scope",
    "packet_status",
    "created_at",
    "data_as_of",
    "producer",
}

REQUIRED_FIELD = {
    "value",
    "status",
    "source",
    "source_url",
    "as_of",
    "confidence",
    "fallback_used",
    "notes",
}

REQUIRED_GAP = {"field", "required_for", "impact", "next_source"}
PACKET_STATUSES = {"complete", "partial", "failed"}
FIELD_STATUSES = {
    "verified",
    "cross_checked",
    "derived",
    "user_provided",
    "not_applicable",
    "missing",
    "conflict",
}
CONFIDENCES = {"high", "medium", "low", "unknown"}


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        packet = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"invalid json: {exc}"]

    meta = packet.get("meta")
    if not isinstance(meta, dict):
        errors.append("meta must be an object")
    else:
        missing = REQUIRED_META - set(meta)
        if missing:
            errors.append(f"meta missing keys: {sorted(missing)}")
        if meta.get("packet_status") not in PACKET_STATUSES:
            errors.append("meta.packet_status must be complete/partial/failed")
        if meta.get("producer") != "stock-data-foundation":
            errors.append("meta.producer must be stock-data-foundation")

    fields = packet.get("fields")
    if not isinstance(fields, dict):
        errors.append("fields must be an object")
    else:
        for key, value in fields.items():
            if "." not in key:
                errors.append(f"field key must use group.field format: {key}")
            if not isinstance(value, dict):
                errors.append(f"field {key} must be an object")
                continue
            missing = REQUIRED_FIELD - set(value)
            if missing:
                errors.append(f"field {key} missing keys: {sorted(missing)}")
            if value.get("status") not in FIELD_STATUSES:
                errors.append(f"field {key} has invalid status: {value.get('status')}")
            if value.get("confidence") not in CONFIDENCES:
                errors.append(f"field {key} has invalid confidence: {value.get('confidence')}")
            if not isinstance(value.get("fallback_used"), bool):
                errors.append(f"field {key}.fallback_used must be boolean")

    gaps = packet.get("gaps", [])
    if not isinstance(gaps, list):
        errors.append("gaps must be a list")
    else:
        for idx, gap in enumerate(gaps):
            if not isinstance(gap, dict):
                errors.append(f"gap {idx} must be an object")
                continue
            missing = REQUIRED_GAP - set(gap)
            if missing:
                errors.append(f"gap {idx} missing keys: {sorted(missing)}")

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_packet.py <packet.json>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    errors = validate(path)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"OK: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
