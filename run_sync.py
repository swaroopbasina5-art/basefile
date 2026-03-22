#!/usr/bin/env python3
"""CLI entry point for the Retool data sync.

Usage:
    # One-time fetch (yesterday's data)
    python run_sync.py

    # Fetch a specific date
    python run_sync.py --date 2026-03-15

    # Fetch a date range
    python run_sync.py --from-date 2026-03-10 --to-date 2026-03-15

    # Run as a scheduled daemon (uses SYNC_CRON from .env)
    python run_sync.py --daemon

    # Output only CSV
    python run_sync.py --format csv
"""

import argparse
import logging
import sys
from datetime import date, datetime, timedelta

from retool_sync.config import CITY_CONFIG, DEFAULT_CITY, LOG_DIR, LOG_LEVEL
from retool_sync.sync import RetoolDataSync


def _setup_logging():
    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    handlers = [
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "sync.log"),
    ]
    logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=fmt, handlers=handlers)


def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def main():
    parser = argparse.ArgumentParser(description="Retool order data sync")
    parser.add_argument("--date", type=_parse_date, help="Single date to fetch (YYYY-MM-DD)")
    parser.add_argument("--from-date", type=_parse_date, help="Start of date range")
    parser.add_argument("--to-date", type=_parse_date, help="End of date range (inclusive)")
    parser.add_argument("--format", choices=["json", "csv", "both"], default="both", help="Output format")
    parser.add_argument("--city", choices=list(CITY_CONFIG.keys()), default=DEFAULT_CITY, help="City to fetch data for (default: blr)")
    parser.add_argument("--columns", nargs="+", help="Only include these columns (e.g. --columns rider_name rider_number store_name)")
    parser.add_argument("--daemon", action="store_true", help="Run as scheduled daemon")
    args = parser.parse_args()

    _setup_logging()
    logger = logging.getLogger("run_sync")

    if args.daemon:
        from retool_sync.scheduler import run_scheduler
        run_scheduler()
        return

    syncer = RetoolDataSync()

    if args.from_date and args.to_date:
        current = args.from_date
        while current <= args.to_date:
            logger.info("--- Syncing %s [%s] ---", current.isoformat(), args.city)
            saved = syncer.fetch_and_save(target_date=current, city=args.city, fmt=args.format, columns=args.columns)
            for fmt, path in saved.items():
                print(f"  {fmt}: {path}")
            current += timedelta(days=1)
    else:
        target = args.date or (date.today() - timedelta(days=1))
        logger.info("Syncing %s [%s] …", target.isoformat(), args.city)
        saved = syncer.fetch_and_save(target_date=target, city=args.city, fmt=args.format, columns=args.columns)
        for fmt, path in saved.items():
            print(f"  {fmt}: {path}")

    if not any(True for _ in []):
        logger.info("Done.")


if __name__ == "__main__":
    main()
