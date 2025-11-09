#!/usr/bin/env python3
"""
parse_eo_bmf.py

Downloads (or reads) the IRS Exempt Organizations Business Master File (EO BMF) CSV
and produces a cleaned CSV with primary fields (EIN, org name, mailing address, city, state, zip).

Usage:
  python scripts/parse_eo_bmf.py --url <csv_url> --out eo_clean.csv
  python scripts/parse_eo_bmf.py --infile /path/to/eo_bmf.csv --out eo_clean.csv

Notes:
- The IRS file column names change over time. This script attempts to map common
  column names heuristically. Inspect the output to confirm fields are correct.
- This script does NOT attempt to enrich with email/phone — use Open990 or a
  commercial provider (Candid/GuideStar) for contact info.

"""

import argparse
import csv
import os
import shutil
import sys
import tempfile
import zipfile
from typing import List, Optional, Tuple

try:
    import requests
except Exception:
    print("requests is required. Install with: pip install -r scripts/requirements.txt")
    raise


def download_file(url: str, target_path: str) -> None:
    """Download a URL to a local file with streaming."""
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(target_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)


def find_column(cols, candidates):
    """Return the first column name in cols that matches any candidate (case-insensitive, substring)."""
    cols_lc = [c.lower() for c in cols]
    for cand in candidates:
        for i, c in enumerate(cols_lc):
            if cand in c:
                return cols[i]
    return None


def normalize_row(row, cols):
    # Keep as-is dictionary mapping
    return {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}


def process_csv(input_path: str, output_path: str):
    """Read the CSV, map columns heuristically, and write a cleaned CSV."""
    with open(input_path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        cols = reader.fieldnames or []

        # Heuristic candidates for important columns
        ein_col = find_column(cols, ["ein", "employer identification number", "e i n"]) or "EIN"
        name_col = find_column(cols, ["name", "organization name", "org_name", "business name"]) or "NAME"
        addr_col = find_column(cols, ["address", "mailing address", "address line", "mailingaddress"]) or "ADDRESS"
        city_col = find_column(cols, ["city"])
        state_col = find_column(cols, ["state", "st"])
        zip_col = find_column(cols, ["zip", "zipcode", "zip code"])

        # Some IRS extracts have dedicated mailing columns like MAILING_ADDRESS_1 etc.
        # We'll fallback to a best-effort selection.

        out_fields = [
            "ein",
            "name",
            "mailing_address",
            "city",
            "state",
            "zip",
        ]

        with open(output_path, "w", newline="", encoding="utf-8") as out_f:
            writer = csv.DictWriter(out_f, fieldnames=out_fields)
            writer.writeheader()

            for raw in reader:
                row = normalize_row(raw, cols)
                out = {
                    "ein": row.get(ein_col, "") if ein_col in row else (row.get("EIN", "") if "EIN" in row else ""),
                    "name": row.get(name_col, "") if name_col in row else "",
                    "mailing_address": row.get(addr_col, "") if addr_col in row else "",
                    "city": row.get(city_col, "") if city_col in row else "",
                    "state": row.get(state_col, "") if state_col in row else "",
                    "zip": row.get(zip_col, "") if zip_col in row else "",
                }
                writer.writerow(out)


def extract_csv_from_zip(zip_path: str, member: Optional[str] = None) -> str:
    """Extract a CSV member from a ZIP archive to a temp file and return the path."""
    with zipfile.ZipFile(zip_path) as zf:
        members = zf.namelist()
        target = member or next((name for name in members if name.lower().endswith(".csv")), None)
        if not target:
            raise ValueError("No CSV file found inside ZIP")

        temp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
        temp.close()
        with zf.open(target) as src, open(temp.name, "wb") as dst:
            shutil.copyfileobj(src, dst)
    return temp.name


def prepare_input_path(input_path: str, zip_member: Optional[str]) -> Tuple[str, List[str]]:
    """Return actual CSV path and list of temp files to cleanup."""
    cleanup: List[str] = []
    actual_path = input_path

    if zipfile.is_zipfile(actual_path):
        actual_path = extract_csv_from_zip(actual_path, member=zip_member)
        cleanup.append(actual_path)

    return actual_path, cleanup


def main():
    p = argparse.ArgumentParser(description="Download and parse IRS EO BMF CSV to a cleaned CSV.")
    p.add_argument("--url", help="Direct URL to EO BMF CSV to download (optional)")
    p.add_argument("--infile", help="Local path to EO BMF CSV (optional)")
    p.add_argument("--out", required=True, help="Output CSV path for cleaned data")
    p.add_argument(
        "--zip-member",
        help="Optional exact file name inside a ZIP archive if multiple CSVs exist",
    )
    args = p.parse_args()

    if not args.url and not args.infile:
        print("Error: either --url or --infile must be provided.")
        sys.exit(1)

    if args.url:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
        tmp.close()
        print(f"Downloading {args.url} -> {tmp.name}")
        try:
            download_file(args.url, tmp.name)
        except Exception as e:
            print("Download failed:", e)
            os.unlink(tmp.name)
            sys.exit(1)
        input_path = tmp.name
    else:
        input_path = args.infile
        if not os.path.exists(input_path):
            print("Input file does not exist:", input_path)
            sys.exit(1)

    actual_input_path, cleanup_paths = prepare_input_path(input_path, args.zip_member)

    print("Processing CSV... this may take a while for large files.")
    try:
        process_csv(actual_input_path, args.out)
    except Exception as e:
        print("Processing failed:", e)
        if args.url and os.path.exists(input_path):
            os.unlink(input_path)
        for tmp_path in cleanup_paths:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        sys.exit(1)

    print(f"Wrote cleaned CSV to {args.out}")

    # cleanup if downloaded
    if args.url and os.path.exists(input_path):
        os.unlink(input_path)
    for tmp_path in cleanup_paths:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    main()
