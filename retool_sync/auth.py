"""Retool authentication – login, token refresh, and session management."""

import json
import logging
import time
from pathlib import Path

import requests

from .config import LOGIN_URL, RETOOL_BASE_URL, RETOOL_EMAIL, RETOOL_PASSWORD

logger = logging.getLogger(__name__)

TOKEN_CACHE_FILE = Path(".retool_token_cache.json")


class RetoolAuth:
    """Handles Retool cookie-based authentication."""

    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.xsrf_token = None
        self._load_cached_token()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_session(self) -> requests.Session:
        """Return an authenticated requests.Session, logging in if needed."""
        if not self._is_authenticated():
            self.login()
        return self.session

    def login(self) -> None:
        """Authenticate against Retool and store session cookies."""
        logger.info("Logging in to Retool as %s …", RETOOL_EMAIL)

        payload = {"email": RETOOL_EMAIL, "password": RETOOL_PASSWORD}
        headers = {
            "Content-Type": "application/json",
            "Origin": RETOOL_BASE_URL,
            "Referer": f"{RETOOL_BASE_URL}/auth/login",
        }

        resp = self._request_with_retry(
            "POST", LOGIN_URL, json=payload, headers=headers
        )
        resp.raise_for_status()

        # Extract tokens from response cookies
        cookies = self.session.cookies.get_dict()
        self.access_token = cookies.get("accessToken")
        self.xsrf_token = cookies.get("xsrfToken")

        # Also check the response body for tokens
        try:
            body = resp.json()
            if "accessToken" in body:
                self.access_token = body["accessToken"]
            if "xsrfToken" in body:
                self.xsrf_token = body["xsrfToken"]
        except (ValueError, KeyError):
            pass

        if not self.access_token:
            raise RuntimeError(
                "Login succeeded (HTTP %s) but no accessToken found in "
                "cookies or response body." % resp.status_code
            )

        self._save_cached_token()
        logger.info("Login successful – tokens cached.")

    def refresh_if_needed(self) -> None:
        """Re-login if the current token appears expired (401 on a probe)."""
        probe_url = f"{RETOOL_BASE_URL}/api/user"
        try:
            r = self.session.get(probe_url, timeout=15)
            if r.status_code == 401:
                logger.warning("Token expired – re-authenticating …")
                self.login()
        except requests.RequestException:
            self.login()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _is_authenticated(self) -> bool:
        return bool(self.access_token and self.xsrf_token)

    def _request_with_retry(self, method, url, max_retries=4, **kwargs):
        """HTTP request with exponential back-off on network errors."""
        for attempt in range(max_retries):
            try:
                return self.session.request(method, url, timeout=30, **kwargs)
            except requests.ConnectionError as exc:
                wait = 2 ** (attempt + 1)
                logger.warning(
                    "Connection error (attempt %d/%d): %s – retrying in %ds",
                    attempt + 1, max_retries, exc, wait,
                )
                time.sleep(wait)
        # Final attempt – let it raise
        return self.session.request(method, url, timeout=30, **kwargs)

    def _save_cached_token(self) -> None:
        data = {
            "access_token": self.access_token,
            "xsrf_token": self.xsrf_token,
            "cookies": dict(self.session.cookies),
        }
        TOKEN_CACHE_FILE.write_text(json.dumps(data))

    def _load_cached_token(self) -> None:
        if not TOKEN_CACHE_FILE.exists():
            return
        try:
            data = json.loads(TOKEN_CACHE_FILE.read_text())
            self.access_token = data.get("access_token")
            self.xsrf_token = data.get("xsrf_token")
            for name, value in data.get("cookies", {}).items():
                self.session.cookies.set(name, value)
            logger.info("Loaded cached tokens.")
        except (json.JSONDecodeError, KeyError):
            logger.warning("Token cache corrupted – will re-login.")
