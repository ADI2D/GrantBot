Open990 enrichment — instructions

This document explains how to register for Open990 and run `enrich_open990.py` to augment
`eo_clean.csv` with website/phone/email fields.

Open990 registration
1) Visit: https://www.open990.org
2) Create an account and follow the API registration process (they may require basic info and terms acceptance).
3) Obtain your API key and keep it secret. Save it in a file `~/.open990.key` or set the environment variable `OPEN990_API_KEY`.

Run the enrichment script (example):

```bash
# use virtualenv from previous README
source .venv/bin/activate
# export key (option A)
export OPEN990_API_KEY="your_key_here"
python scripts/enrich_open990.py --input eo_clean.csv --output eo_enriched.csv

# OR use api key file (option B)
python scripts/enrich_open990.py --input eo_clean.csv --output eo_enriched.csv --api-key-file ~/.open990.key

# Limit to 200 EINs and slow down to 1s between requests
python scripts/enrich_open990.py --input eo_clean.csv --output eo_enriched.csv --limit 200 --sleep 1.0
```

Notes & best practices
- Start small: run with `--limit 50` to validate mapping and output before doing the full dataset.
- Inspect `eo_enriched.csv` for `open990_raw` and `open990_error` columns to understand what the API returned.
- Respect Open990 rate limits and terms. The script uses a default 0.5s sleep; increase if you see HTTP 429 responses.
- Open990 returns different payload shapes depending on your access level; if fields are missing, you may need elevated access or a commercial dataset (Candid/GuideStar).

Privacy and legal
- Do not redistribute harvested emails and phone numbers without ensuring you have the right to do so and without complying with applicable laws (CAN-SPAM, TCPA, state rules).
- If you plan to contact organizations en masse, acquire consent where required and follow good emailing practices.

If you'd like, I can:
- Run a demo enrichment on a small list (up to 200 EINs) if you provide an API key or allow me to use one you provide.
- Extend the script to also query Open990 by organization name or to fallback to other APIs (e.g., ProPublica) when EIN lookup fails.
