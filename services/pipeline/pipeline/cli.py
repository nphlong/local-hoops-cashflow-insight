from __future__ import annotations

import argparse
import json
from pathlib import Path

from pipeline.export_pages import export_pages
from pipeline.ingest import ingest_dir
from pipeline.paths import DATA_RAW, PAGES_OUT


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Local Hoops statement pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    ingest_p = sub.add_parser("ingest", help="Parse raw xlsx into encrypted SQLite")
    ingest_p.add_argument("--raw", type=Path, default=DATA_RAW)

    export_p = sub.add_parser("export-pages", help="Write redacted tab JSON for GitHub Pages")
    export_p.add_argument("--out", type=Path, default=PAGES_OUT)

    args = parser.parse_args(argv)
    if args.command == "ingest":
        stats = ingest_dir(args.raw)
        print(json.dumps(stats, indent=2))
        return 0
    dest = export_pages(args.out)
    print(f"Wrote redacted snapshot to {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
