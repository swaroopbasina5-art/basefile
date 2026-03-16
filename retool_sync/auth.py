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
        """Authenticate against Retool (two-step: login → saveAuth)."""
        logger.info("Logging in to Retool as %s …", RETOOL_EMAIL)

        headers = {
            "Content-Type": "application/json",
            "Origin": RETOOL_BASE_URL,
            "Referer": f"{RETOOL_BASE_URL}/auth/login",
        }

        # Step 1: POST /api/login → get authorizationToken + authUrl
        resp = self._request_with_retry(
            "POST", LOGIN_URL,
            json={"email": RETOOL_EMAIL, "password": RETOOL_PASSWORD},
            headers=headers,
        )
        resp.raise_for_status()
        body = resp.json()

        auth_url = body.get("authUrl")
        auth_token = body.get("authorizationToken")

        if not auth_url or not auth_token:
            raise RuntimeError(
                "Login response missing authUrl/authorizationToken. "
                "Keys received: %s" % list(body.keys())
            )

        # Step 2: POST authUrl with the token → session cookies are set
        resp2 = self._request_with_retry(
            "POST", auth_url,
            json={"authorizationToken": auth_token},
            headers=headers,
        )
        resp2.raise_for_status()

        # Extract tokens from session cookies
        cookies = self.session.cookies.get_dict()
        self.access_token = cookies.get("accessToken")
        self.xsrf_token = cookies.get("xsrfToken")

        if not self.access_token:
            raise RuntimeError(
                "saveAuth succeeded but no accessToken cookie found. "
                "Cookies: %s" % list(cookies.keys())
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
        # Use items() to handle duplicate cookie names safely
        cookie_list = [
            {"name": c.name, "value": c.value, "domain": c.domain, "path": c.path}
            for c in self.session.cookies
        ]
        data = {
            "access_token": self.access_token,
            "xsrf_token": self.xsrf_token,
            "cookies": cookie_list,
        }
        TOKEN_CACHE_FILE.write_text(json.dumps(data))

    def _load_cached_token(self) -> None:
        if not TOKEN_CACHE_FILE.exists():
            return
        try:
            data = json.loads(TOKEN_CACHE_FILE.read_text())
            self.access_token = data.get("access_token")
            self.xsrf_token = data.get("xsrf_token")
            for c in data.get("cookies", []):
                if isinstance(c, dict):
                    self.session.cookies.set(
                        c["name"], c["value"],
                        domain=c.get("domain", ""), path=c.get("path", "/"),
                    )
                else:
                    # Legacy format: plain dict
                    pass
            logger.info("Loaded cached tokens.")
        except (json.JSONDecodeError, KeyError):
            logger.warning("Token cache corrupted – will re-login.")
