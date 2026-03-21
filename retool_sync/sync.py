"""Data sync – fetch order data from Retool and save locally."""

import csv
import json
import logging
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import requests

from .auth import RetoolAuth
from .config import (
    DATA_DIR,
    DEFAULT_CITY,
    DEFAULT_CLIENT_ID,
    QUERY_URL,
    RETOOL_QUERY_NAME,
    get_city_config,
)

logger = logging.getLogger(__name__)


class RetoolDataSync:
    """Fetches order data from the Retool dashboard API and saves it."""

    def __init__(self, auth: RetoolAuth | None = None):
        self.auth = auth or RetoolAuth()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fetch_orders(
        self,
        target_date: date | None = None,
        city: str = DEFAULT_CITY,
        client_id: int = DEFAULT_CLIENT_ID,
        city_id: int | None = None,
        store_ids: list[int] | None = None,
        include_bto: bool = True,
        order_id_filter: str = "",
    ) -> list[dict[str, Any]]:
        """Fetch order details for *target_date* (defaults to yesterday)."""
        if target_date is None:
            target_date = date.today() - timedelta(days=1)

        cfg = get_city_config(city)
        city_id = city_id or cfg["city_id"]
        if city_id is None:
            raise ValueError(f"city_id not configured for '{city}'. Update CITY_CONFIG in config.py.")
        store_ids = store_ids or sorted(cfg["store_name_map"].values())
        if not store_ids:
            raise ValueError(f"No store IDs configured for '{city}'. Update CITY_CONFIG in config.py.")
        next_date = target_date + timedelta(days=1)

        payload = {
            "userParams": {
                "queryParams": {
                    "0": client_id,
                    "1": city_id,
                    "2": target_date.isoformat(),
                    "3": next_date.isoformat(),
                    "4": False,
                    "5": store_ids,
                    "6": include_bto,
                    "7": order_id_filter,
                }
            }
        }

        self.auth.refresh_if_needed()
        session = self.auth.get_session()

        headers = {
            "Content-Type": "application/json",
            "x-xsrf-token": self.auth.xsrf_token,
        }
        params = {"queryName": RETOOL_QUERY_NAME}

        logger.info(
            "Fetching orders for %s (client=%s, city=%s, stores=%d) …",
            target_date.isoformat(),
            client_id,
            city_id,
            len(store_ids),
        )

        # Retry on network errors (chunked encoding, connection reset, etc.)
        max_retries = 4
        for attempt in range(max_retries + 1):
            try:
                resp = session.post(
                    QUERY_URL, params=params, headers=headers, json=payload, timeout=120
                )

                if resp.status_code == 401:
                    logger.warning("Got 401 – re-authenticating and retrying …")
                    self.auth.login()
                    headers["x-xsrf-token"] = self.auth.xsrf_token
                    session = self.auth.get_session()
                    continue

                # Retool returns 400 for query timeouts
                data = resp.json()
                if resp.status_code == 400 and data.get("error"):
                    logger.error("Retool query error (HTTP 400): %s", data.get("message"))
                    return []
                resp.raise_for_status()

                rows = self._extract_rows(data)
                logger.info("Fetched %d order rows.", len(rows))
                return rows

            except (requests.ConnectionError, requests.ChunkedEncodingError) as exc:
                if attempt < max_retries:
                    wait = 2 ** (attempt + 1)
                    logger.warning(
                        "Network error (attempt %d/%d): %s – retrying in %ds",
                        attempt + 1, max_retries, type(exc).__name__, wait,
                    )
                    time.sleep(wait)
                else:
                    raise

        return []

    def fetch_and_save(
        self,
        target_date: date | None = None,
        city: str = DEFAULT_CITY,
        fmt: str = "both",
        columns: list[str] | None = None,
        **kwargs,
    ) -> dict[str, Path]:
        """Fetch orders and persist to disk. Returns paths of saved files.

        Args:
            target_date: Date to fetch (default: yesterday).
            city: City key (blr, mumbai, pune).
            fmt: "json", "csv", or "both".
            columns: If set, only keep these columns in the output.
        """
        if target_date is None:
            target_date = date.today() - timedelta(days=1)

        rows = self.fetch_orders(target_date=target_date, city=city, **kwargs)

        # Filter to requested columns only
        if columns and rows:
            available = set(rows[0].keys())
            missing = [c for c in columns if c not in available]
            if missing:
                logger.warning("Columns not found in data (skipped): %s", missing)
            keep = [c for c in columns if c in available]
            rows = [{k: row[k] for k in keep} for row in rows]
            logger.info("Filtered to %d columns: %s", len(keep), keep)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        date_str = target_date.isoformat()
        city_lower = city.lower()
        saved: dict[str, Path] = {}

        if fmt in ("json", "both"):
            path = DATA_DIR / f"orders_{city_lower}_{date_str}_{timestamp}.json"
            path.write_text(json.dumps(rows, indent=2, default=str))
            saved["json"] = path
            logger.info("Saved JSON → %s", path)

        if fmt in ("csv", "both") and rows:
            path = DATA_DIR / f"orders_{city_lower}_{date_str}_{timestamp}.csv"
            self._write_csv(rows, path)
            saved["csv"] = path
            logger.info("Saved CSV  → %s", path)

        if not rows:
            logger.warning("No rows returned for %s – nothing saved.", date_str)

        return saved

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_rows(data: dict) -> list[dict]:
        """Navigate Retool's response and convert to row-oriented dicts.

        Retool returns column-oriented data like:
            {"order_id": ["A", "B"], "status": ["X", "Y"]}
        We convert to:
            [{"order_id": "A", "status": "X"}, {"order_id": "B", "status": "Y"}]
        """
        # Check for query errors
        if data.get("error"):
            msg = data.get("message", "Unknown query error")
            logger.error("Retool query error: %s", msg)
            return []

        # Retool returns column-oriented dict at top level
        # Detect: all top-level values are lists of the same length
        if isinstance(data, dict) and data:
            values = list(data.values())
            if all(isinstance(v, list) for v in values):
                lengths = {len(v) for v in values}
                if len(lengths) == 1:
                    n = lengths.pop()
                    keys = list(data.keys())
                    return [{k: data[k][i] for k in keys} for i in range(n)]

        # Fallback: row-oriented shapes
        if isinstance(data.get("data"), list):
            return data["data"]
        if isinstance(data.get("data"), dict):
            inner = data["data"]
            if isinstance(inner.get("data"), list):
                return inner["data"]
            if isinstance(inner.get("rows"), list):
                return inner["rows"]
        if isinstance(data, list):
            return data

        logger.warning("Unexpected response shape – saving raw payload.")
        return [data]

    @staticmethod
    def _write_csv(rows: list[dict], path: Path) -> None:
        fieldnames = list(rows[0].keys())
        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
