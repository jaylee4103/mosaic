"""Regenerate openapi.json from the live FastAPI app.

Run from apps/ml/: PYTHONPATH=. .venv/bin/python scripts/export_openapi.py

Keeping this generated (rather than hand-maintained) means the checked-in
spec can't drift from what the service actually serves.
"""

import json
from pathlib import Path

from app.main import app

OUTPUT_PATH = Path(__file__).parent.parent / "openapi.json"


def main() -> None:
    spec = app.openapi()
    OUTPUT_PATH.write_text(json.dumps(spec, indent=2) + "\n")
    print(f"Wrote {OUTPUT_PATH} ({len(json.dumps(spec))} bytes)")


if __name__ == "__main__":
    main()
