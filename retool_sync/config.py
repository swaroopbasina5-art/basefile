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

# Per-city configuration: store name → ID mappings, city IDs
# All cities share the same client ID
DEFAULT_CLIENT_ID = 384624

CITY_CONFIG = {
    "blr": {
        "city_id": 22411,
        "store_name_map": {
            "TBC8": 3485, "TBC9": 3714, "TBF1": 3487, "TBF2": 3488, "TBF3": 3495,
            "TBF4": 3490, "TBF5": 3491, "TBF6": 3492, "TBF7": 3493, "TBF8": 3494,
            "TBF9": 3712, "TBH1": 3811, "TBH2": 3486, "TBH3": 3812, "TBH4": 3813,
            "TBH5": 3814, "TBH6": 3815, "TBH7": 3816, "TBH8": 3840, "TBH9": 3981,
            "TBI1": 3817, "TBI2": 3818, "TBI3": 3820, "TBI4": 3821, "TBI5": 4326,
            "TBI6": 3819, "TBI7": 3822, "TBI8": 3823, "TBI9": 3824, "TBJ1": 3841,
            "TBJ2": 3978, "TBJ3": 3979, "TBJ4": 3980, "TBJ5": 4065, "TBJ6": 4096,
            "TBJ7": 4097, "TBJ8": 4098, "TBJ9": 4099, "TBK1": 4100, "TBK2": 4101,
            "TBK4": 4103, "TBK5": 4104, "TBK6": 4066, "TBK7": 4003, "TBK8": 4002,
            "TBK9": 3982, "TBL1": 3983, "TBL2": 3984, "TBL3": 3985, "TBL4": 4001,
            "TBL5": 3987, "TBL6": 3988, "TBL8": 4037, "TBL9": 4038, "TBM1": 4039,
            "TBM2": 4040, "TBM3": 4041, "TBM4": 4054, "TBN3": 4107, "TBN6": 4109,
            "TBN7": 4110, "TBN8": 4111, "TBP1": 4113, "TBP3": 4114, "TBQ5": 4036,
            "TBQ6": 4042, "TBQ7": 4123, "TBQ9": 4125, "TBR1": 4126, "TBR2": 4127,
            "TBR3": 4128, "TBR4": 4129, "TBR5": 4130, "TBR7": 4069, "TBR8": 4132,
            "TBS2": 4133, "TBS3": 4134, "TBS4": 4135,
        },
    },
    "mumbai": {
        "city_id": None,  # TODO: fill in Mumbai city_id from Retool
        "store_name_map": {},  # TODO: fill in Mumbai store mappings
    },
    "pune": {
        "city_id": None,  # TODO: fill in Pune city_id from Retool
        "store_name_map": {},  # TODO: fill in Pune store mappings
    },
}

DEFAULT_CITY = "blr"


def get_city_config(city: str) -> dict:
    """Return config dict for the given city key."""
    city = city.lower()
    if city not in CITY_CONFIG:
        raise ValueError(f"Unknown city '{city}'. Available: {', '.join(CITY_CONFIG)}")
    return CITY_CONFIG[city]


# Backwards-compatible defaults (BLR)
STORE_NAME_MAP = CITY_CONFIG["blr"]["store_name_map"]
DEFAULT_STORE_IDS = sorted(STORE_NAME_MAP.values())
DEFAULT_CITY_ID = CITY_CONFIG["blr"]["city_id"]
