from __future__ import annotations

import argparse
import json
from pathlib import Path

from pipeline.export_pages import export_pages
from pipeline.ingest import ingest_dir
from pipeline.paths import DATA_RAW, company_pages


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Local Hoops statement pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    ingest_p = sub.add_parser("ingest", help="Parse raw statements into encrypted SQLite")
    ingest_p.add_argument("--raw", type=Path, default=DATA_RAW)
    ingest_p.add_argument("--company", choices=("local-hoops", "tlsc"), default="local-hoops")

    export_p = sub.add_parser("export-pages", help="Write redacted tab JSON for GitHub Pages")
    export_p.add_argument("--company", choices=("local-hoops", "tlsc"), default="local-hoops")
    export_p.add_argument("--out", type=Path, default=None)

    args = parser.parse_args(argv)
    if args.command == "ingest":
        stats = ingest_dir(args.raw, company=args.company)
        print(json.dumps(stats, indent=2))
        return 0
    dest = export_pages(args.out or company_pages(args.company), company=args.company)
    print(f"Wrote redacted snapshot to {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
