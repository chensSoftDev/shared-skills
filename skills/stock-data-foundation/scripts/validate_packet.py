#!/usr/bin/env python3
import json
import sys
from pathlib import Path

META_REQUIRED = {
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

FIELD_REQUIRED = {
    "value",
    "status",
    "source",
    "source_url",
    "as_of",
    "confidence",
    "fallback_used",
    "notes",
}

VALID_PACKET_STATUS = {"complete", "partial", "failed"}
VALID_FIELD_STATUS = {
    "verified",
    "cross_checked",
    "derived",
    "user_provided",
    "not_applicable",
    "missing",
    "conflict",
}
VALID_CONFIDENCE = {"high", "medium", "low", "unknown"}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def validate(path: Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(data.get("meta"), dict):
        fail("meta must be an object")
    missing_meta = META_REQUIRED - data["meta"].keys()
    if missing_meta:
        fail(f"missing meta fields: {sorted(missing_meta)}")
    if data["meta"]["packet_status"] not in VALID_PACKET_STATUS:
        fail("invalid packet_status")

    fields = data.get("fields")
    if not isinstance(fields, dict) or not fields:
        fail("fields must be a non-empty object")

    for key, field in fields.items():
        if "." not in key:
            fail(f"field key must use group.field format: {key}")
        if not isinstance(field, dict):
            fail(f"field must be an object: {key}")
        missing = FIELD_REQUIRED - field.keys()
        if missing:
            fail(f"{key} missing attributes: {sorted(missing)}")
        if field["status"] not in VALID_FIELD_STATUS:
            fail(f"{key} invalid status: {field['status']}")
        if field["confidence"] not in VALID_CONFIDENCE:
            fail(f"{key} invalid confidence: {field['confidence']}")
        if not isinstance(field["fallback_used"], bool):
            fail(f"{key} fallback_used must be boolean")

    gaps = data.get("gaps", [])
    if not isinstance(gaps, list):
        fail("gaps must be a list")

    print(f"OK: {path}")


def main() -> None:
    if len(sys.argv) < 2:
        fail("usage: validate_packet.py PACKET.json [PACKET.json ...]")
    for arg in sys.argv[1:]:
        validate(Path(arg))


if __name__ == "__main__":
    main()
