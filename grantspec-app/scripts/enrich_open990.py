#!/usr/bin/env python3
"""
enrich_open990.py

Augment a cleaned EO CSV (output from parse_eo_bmf.py) with contact fields from Open990.

Usage:
  python scripts/enrich_open990.py --input eo_clean.csv --output eo_enriched.csv --api-key-file ~/.open990.key
  python scripts/enrich_open990.py --input eo_clean.csv --output eo_enriched.csv --api-key "$OPEN990_API_KEY"

Notes:
- You must register at https://www.open990.org to obtain an API key. Open990 may have rate limits and access requirements.
- This script is conservative: it fetches one EIN at a time and sleeps between requests to avoid hammering the API.
- The Open990 API contract can change; this script tries to be tolerant of different response shapes.

"""

import argparse
import csv
import json
import os
import sys
import time
from typing import Dict, Optional

try:
    import requests
except Exception:
    print("requests is required. Install with: pip install -r scripts/requirements.txt")
    raise


DEFAULT_BASE_URL = "https://api.open990.org/v1/organizations"


def load_api_key(args) -> Optional[str]:
    # priority: --api_key arg, env var OPEN990_API_KEY, api_key_file
    if args.api_key:
        return args.api_key
    if args.env_var and os.environ.get(args.env_var):
        return os.environ.get(args.env_var)
    if args.api_key_file and os.path.exists(os.path.expanduser(args.api_key_file)):
        with open(os.path.expanduser(args.api_key_file), "r", encoding="utf-8") as f:
            return f.read().strip()
    return None


def query_open990(ein: str, api_key: Optional[str], base_url: str, session: requests.Session) -> Dict:
    """Query Open990 for a single EIN. Return parsed JSON or empty dict on error."""
    params = {"ein": ein}
    headers = {}
    url = base_url

    # Support both header bearer and query param fallback
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        # Some implementations also accept api_key param; we'll avoid sending it unless no header
    else:
        # no api key provided — try unauthenticated
        pass

    try:
        r = session.get(url, headers=headers, params=params, timeout=30)
    except requests.RequestException as e:
        return {"_error": f"request_failed: {e}"}

    if r.status_code == 429:
        # rate limited
        return {"_error": "rate_limited", "status_code": 429}

    if r.status_code >= 400:
        return {"_error": f"http_{r.status_code}", "status_code": r.status_code, "text": r.text[:200]}

    try:
        data = r.json()
        # Open990 may return list or object; prefer first object if list
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return data if isinstance(data, dict) else {"_raw": data}
    except Exception as e:
        return {"_error": f"json_parse_error: {e}", "text": r.text[:1000]}


def extract_contact_info(open990_obj: Dict) -> Dict:
    """Try multiple known keys to extract website, phone, email."""
    out = {"website": "", "phone": "", "email": "", "open990_raw": ""}
    if not open990_obj:
        return out

    # Keep JSON string of raw response for later inspection
    try:
        out["open990_raw"] = json.dumps(open990_obj, ensure_ascii=False)
    except Exception:
        out["open990_raw"] = str(open990_obj)

    candidates = []

    # Common shapes: open990 may have top-level 'website', 'phone', or nested keys like 'Organization' -> 'Website'
    for key in ["website", "website_url", "homepage", "url"]:
        if key in open990_obj and open990_obj.get(key):
            out["website"] = open990_obj.get(key)
            break

    for key in ["phone", "telephone", "phone_number", "primary_phone"]:
        if key in open990_obj and open990_obj.get(key):
            out["phone"] = open990_obj.get(key)
            break

    # email less commonly present; try a few keys
    for key in ["email", "contact_email", "primary_email"]:
        if key in open990_obj and open990_obj.get(key):
            out["email"] = open990_obj.get(key)
            break

    # Some providers return nested dicts
    if not out["website"]:
        # search in nested dicts shallowly
        for v in open990_obj.values():
            if isinstance(v, dict):
                for key in ["website", "url", "homepage"]:
                    if key in v and v.get(key):
                        out["website"] = v.get(key)
                        break
            if out["website"]:
                break

    if not out["phone"]:
        for v in open990_obj.values():
            if isinstance(v, dict):
                for key in ["phone", "telephone"]:
                    if key in v and v.get(key):
                        out["phone"] = v.get(key)
                        break
            if out["phone"]:
                break

    if not out["email"]:
        for v in open990_obj.values():
            if isinstance(v, dict):
                for key in ["email", "contact_email"]:
                    if key in v and v.get(key):
                        out["email"] = v.get(key)
                        break
            if out["email"]:
                break

    return out


def main():
    p = argparse.ArgumentParser(description="Enrich EO CSV with Open990 contact fields by EIN")
    p.add_argument("--input", required=True, help="Input cleaned EO CSV (EIN column required)")
    p.add_argument("--output", required=True, help="Output enriched CSV")
    p.add_argument("--api-key", help="Open990 API key (optional) — if omitted will try env var or file")
    p.add_argument("--api-key-file", help="File containing API key (optional)")
    p.add_argument("--env-var", default="OPEN990_API_KEY", help="Env var name to read API key from (default OPEN990_API_KEY)")
    p.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Open990 base URL (default set for typical endpoint)")
    p.add_argument("--sleep", type=float, default=0.5, help="Seconds to sleep between requests (default 0.5)")
    p.add_argument("--limit", type=int, default=0, help="Limit number of EINs to process (0 = no limit)")
    p.add_argument("--state", help="Only enrich rows matching this state (two-letter)")
    args = p.parse_args()

    api_key = load_api_key(args)
    if not api_key:
        print("Warning: no API key provided. Some Open990 endpoints may reject unauthenticated requests or have very low rate limits.")

    if not os.path.exists(args.input):
        print("Input file not found:", args.input)
        sys.exit(1)

    # Read input CSV
    with open(args.input, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        in_rows = list(reader)
        in_fields = reader.fieldnames or []

    # Determine EIN column name heuristically
    ein_col = None
    for name in in_fields:
        if name.lower() in ("ein", "ein ", "ein_number") or "ein" in name.lower():
            ein_col = name
            break
    if not ein_col:
        # fallback: common names
        for cand in ["EIN", "ein"]:
            if cand in in_fields:
                ein_col = cand
                break
    if not ein_col:
        print("Could not find EIN column in input CSV. Columns:", in_fields)
        sys.exit(1)

    # Prepare output fields: all input + website/phone/email/open990_raw/_open990_error
    out_fields = list(in_fields) + ["open990_website", "open990_phone", "open990_email", "open990_raw", "open990_error"]

    # Build set of EINs to query, maintain mapping of row indices to EINs
    ein_to_rows = {}
    for i, row in enumerate(in_rows):
        ein_val = (row.get(ein_col) or "").strip()
        if not ein_val:
            continue
        if args.state and row.get("state") and row.get("state").strip().upper() != args.state.strip().upper():
            continue
        if ein_val not in ein_to_rows:
            ein_to_rows[ein_val] = []
        ein_to_rows[ein_val].append(i)

    eins = list(ein_to_rows.keys())
    if args.limit and args.limit > 0:
        eins = eins[: args.limit]

    session = requests.Session()

    # Prepare output rows as copies of input rows with enrichment columns
    out_rows = []
    for row in in_rows:
        nr = dict(row)
        nr.update({"open990_website": "", "open990_phone": "", "open990_email": "", "open990_raw": "", "open990_error": ""})
        out_rows.append(nr)

    print(f"Will enrich {len(eins)} EIN(s). Total input rows: {len(in_rows)}. Sleeping {args.sleep}s between requests.")

    for idx, ein in enumerate(eins, start=1):
        print(f"[{idx}/{len(eins)}] Querying EIN {ein}...")
        res = query_open990(ein, api_key, args.base_url, session)
        if res.get("_error") == "rate_limited":
            # backoff and retry a few times
            print("Rate limited. Backing off for 10s and retrying once.")
            time.sleep(10)
            res = query_open990(ein, api_key, args.base_url, session)

        if res.get("_error"):
            err = res.get("_error")
            print(f"Got error for EIN {ein}: {err}")
            contact = {"website": "", "phone": "", "email": "", "open990_raw": json.dumps(res)}
            # annotate all rows with this EIN
            for r_i in ein_to_rows.get(ein, []):
                out_rows[r_i]["open990_error"] = err
                out_rows[r_i]["open990_raw"] = out_rows[r_i]["open990_raw"] or json.dumps(res)
        else:
            contact = extract_contact_info(res)
            for r_i in ein_to_rows.get(ein, []):
                out_rows[r_i]["open990_website"] = contact.get("website", "")
                out_rows[r_i]["open990_phone"] = contact.get("phone", "")
                out_rows[r_i]["open990_email"] = contact.get("email", "")
                out_rows[r_i]["open990_raw"] = contact.get("open990_raw", "")

        # polite sleep
        time.sleep(args.sleep)

    # Write output CSV
    with open(args.output, "w", newline="", encoding="utf-8") as out_f:
        writer = csv.DictWriter(out_f, fieldnames=out_fields)
        writer.writeheader()
        for r in out_rows:
            writer.writerow(r)

    print(f"Wrote enriched CSV to {args.output}")


if __name__ == "__main__":
    main()
