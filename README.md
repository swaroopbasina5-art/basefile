# Retool Order Data Sync

Automated API linkage to fetch order data from the LoadShare Retool dashboard
(`https://lsn.retool.com/app/amazonquick-store-portal`).

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure credentials
cp .env.example .env
# Edit .env with your Retool email/password

# 3. One-time fetch (yesterday's data)
python run_sync.py

# 4. Fetch a specific date
python run_sync.py --date 2026-03-15

# 5. Fetch a date range
python run_sync.py --from-date 2026-03-10 --to-date 2026-03-15

# 6. Output CSV only
python run_sync.py --format csv

# 7. Run as a scheduled daemon (cron from .env, default: every 30 min)
python run_sync.py --daemon
```

## How It Works

1. **Authentication** (`retool_sync/auth.py`): Logs in to Retool using
   email/password, stores session cookies and XSRF tokens, and automatically
   re-authenticates when tokens expire.

2. **Data Sync** (`retool_sync/sync.py`): Calls the Retool page query API
   (same endpoint as the dashboard's internal cURL) with the correct
   parameters (client ID, city ID, store IDs, date range). Saves results as
   JSON and/or CSV.

3. **Scheduler** (`retool_sync/scheduler.py`): Uses APScheduler to run the
   sync on a configurable cron schedule.

## Configuration

All settings are in `.env` (see `.env.example`):

| Variable | Description | Default |
|---|---|---|
| `RETOOL_EMAIL` | Login email | — |
| `RETOOL_PASSWORD` | Login password | — |
| `RETOOL_BASE_URL` | Retool instance URL | `https://lsn.retool.com` |
| `RETOOL_PAGE_UUID` | Dashboard page UUID | `644f7cc8-...` |
| `RETOOL_QUERY_NAME` | Query to execute | `get_order_details` |
| `SYNC_CRON` | Cron schedule for daemon mode | `*/30 * * * *` |
| `DATA_DIR` | Where to save output files | `./data` |
| `LOG_LEVEL` | Logging verbosity | `INFO` |

## Output

Files are saved to `./data/` with the naming pattern:
```
orders_2026-03-15_20260316_083000.json
orders_2026-03-15_20260316_083000.csv
```

## Project Structure

```
├── .env.example          # Template for credentials
├── .gitignore            # Excludes .env, data/, logs/
├── requirements.txt      # Python dependencies
├── run_sync.py           # CLI entry point
└── retool_sync/
    ├── __init__.py
    ├── config.py          # Configuration from .env
    ├── auth.py            # Retool authentication & token management
    ├── sync.py            # Data fetching & file export
    └── scheduler.py       # Cron-based scheduling
```
