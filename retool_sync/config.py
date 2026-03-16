import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Retool connection
RETOOL_EMAIL = os.getenv("RETOOL_EMAIL")
RETOOL_PASSWORD = os.getenv("RETOOL_PASSWORD")
RETOOL_BASE_URL = os.getenv("RETOOL_BASE_URL", "https://lsn.retool.com")
RETOOL_PAGE_UUID = os.getenv("RETOOL_PAGE_UUID", "644f7cc8-a1c9-11ef-8d91-fbdebd641690")
RETOOL_QUERY_NAME = os.getenv("RETOOL_QUERY_NAME", "get_order_details")

# API endpoints
LOGIN_URL = f"{RETOOL_BASE_URL}/api/login"
QUERY_URL = f"{RETOOL_BASE_URL}/api/pages/uuids/{RETOOL_PAGE_UUID}/query"

# Sync schedule
SYNC_CRON = os.getenv("SYNC_CRON", "*/30 * * * *")

# Data output
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = Path(os.getenv("LOG_DIR", "./logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Default query parameters (store IDs for TBF5 / Bangalore)
DEFAULT_STORE_IDS = [
    2734, 4099, 2736, 4101, 3494, 3491, 3495, 3712, 3812, 3813,
    3822, 4042, 4003, 4054, 4123, 4135, 3992, 3997, 3826, 4140,
    4146, 4176, 4092, 4093, 3838, 4049, 4035, 4078, 4215, 4204,
    4033, 4081, 4224,
]
DEFAULT_CLIENT_ID = 384624
DEFAULT_CITY_ID = 22411
