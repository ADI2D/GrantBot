IRS EO BMF -> cleaned CSV

This folder contains a small script to download and parse the IRS Exempt Organizations
Business Master File (EO BMF) CSV and output a cleaned CSV with core fields.

Files:
- `parse_eo_bmf.py` : main script.
- `requirements.txt`: Python deps (requests).

Quick start (macOS, zsh):

1) Create a Python venv (recommended):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

2) Download & parse the EO BMF

The IRS page for the EO BMF is here (download manually or use a direct link):
https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf

Example (download URL may change). The IRS often publishes the extract as a ZIP; the script will detect this automatically and extract the first CSV (or you can provide the member name via `--zip-member`):

```bash
python scripts/parse_eo_bmf.py --url "https://www.irs.gov/pub/irs-soi/eo_bmf.csv" --out eo_clean.csv
# or when the file is zipped
python scripts/parse_eo_bmf.py --url "https://www.irs.gov/pub/irs-soi/eo_bmf.zip" --out eo_clean.csv
python scripts/parse_eo_bmf.py --url "https://www.irs.gov/pub/irs-soi/EO_MARCH2024.zip" --zip-member EO_MARCH2024.csv --out eo_clean.csv
```

Or, if you manually downloaded to `/path/to/eo_bmf.csv`:

```bash
python scripts/parse_eo_bmf.py --infile /path/to/eo_bmf.csv --out eo_clean.csv
python scripts/parse_eo_bmf.py --infile /path/to/eo_bmf.zip --out eo_clean.csv
```

Notes on enrichment with contact data (email/phone):
- The IRS EO BMF typically contains name and mailing address but not reliable email/phone.
- Open990 (https://www.open990.org) offers API access to enriched Form 990 data; registration is required and they may provide website/phone fields.
- Candid/GuideStar is the most comprehensive commercial source for emails/phones (paid licensing required).
- If you plan to enrich by crawling websites, please confirm you accept rate limits and Terms of Service for each target site.

Open990 example (conceptual):
- Register at https://www.open990.org and obtain an API key.
- Typical usage: query by EIN to retrieve organization details (phone, website, leadership).
- Example (pseudo-curl):

  curl -H "Authorization: Bearer <API_KEY>" "https://api.open990.org/v1/organizations?ein=123456789"

I can help wire up Open990 enrichment once you provide an API key or allow me to run a small example (for a small set of EINs).

Privacy & legal reminder:
- Bulk harvesting and redistribution of emails/phone numbers can have legal and ethical implications. Use commercial/licensed data where required and follow CAN-SPAM and TCPA rules when contacting organizations.
