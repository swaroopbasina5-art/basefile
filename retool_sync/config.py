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

# Per-city configuration: store name → ID mappings
# All cities share the same client ID and customer ID (22411).
# The "city_id" param in get_order_details is actually the customer_id.
DEFAULT_CLIENT_ID = 384624
DEFAULT_CUSTOMER_ID = 22411

CITY_CONFIG = {
    "blr": {
        "city_id": DEFAULT_CUSTOMER_ID,
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
        "city_id": DEFAULT_CUSTOMER_ID,
        "store_name_map": {
            "TMA4": 4049, "TMA5": 4050, "TMA6": 4078, "TMA7": 4200, "TMA8": 4201,
            "TMA9": 4079, "TMB2": 4202, "TMB3": 4203, "TMB4": 4204, "TMB5": 4205,
            "TMB6": 4206, "TMB7": 4207, "TMB9": 4208, "TME1": 4209, "TME2": 4210,
            "TME3": 4080, "TME4": 4211, "TME5": 4212, "TME6": 4213, "TME7": 4214,
            "TME8": 3838, "TME9": 3842, "TMF1": 4032, "TMF2": 4033, "TMF3": 4034,
            "TMF4": 4035, "TMF5": 4048, "TMF6": 4053, "TMF7": 4215, "TMF8": 4216,
            "TMF9": 4217, "TMG1": 4218, "TMG2": 4219, "TMG3": 4081, "TMG4": 4220,
            "TMG5": 4221, "TMG6": 4222, "TMG7": 4223, "TMG8": 4224, "TMG9": 4225,
            "TMH1": 4226, "TMH2": 4227, "TMH3": 4228, "TMH4": 4082, "TMH5": 4229,
            "TMH6": 4230, "TMH7": 4231, "TMH8": 4232, "TMH9": 4233, "TMJ1": 4234,
            "TMJ2": 4235, "TMJ3": 4236, "TMJ4": 4237, "TMJ5": 4083, "TMJ6": 4238,
            "TMJ7": 4239, "TMJ8": 4240, "TMJ9": 4241, "TMK1": 4242, "TMK2": 4243,
            "TMK3": 4244, "TMK4": 4245, "TML2": 4251, "TML3": 4252, "TML4": 4253,
            "TMO5": 5390, "TMO6": 5391, "TMO7": 5392, "TMO8": 5393, "TMO9": 5394,
            "TMP2": 5395, "TMP3": 5396, "TMP4": 5397, "TMP5": 5398, "TMP6": 5399,
            "TMP7": 5400, "TMP8": 5401, "TMP9": 5402, "TMQ1": 5403, "TMQ2": 5404,
            "TMQ3": 5405, "TMQ4": 5406, "TMQ5": 5407, "TMQ6": 5408, "TMQ7": 5409,
            "TMQ8": 5410, "TMQ9": 5411, "TMR1": 5412, "TMR2": 5413, "TMR3": 5414,
            "TMR4": 5415, "TMR5": 5416, "TMR6": 5417, "TMR7": 5418, "TMR8": 5419,
            "TMR9": 5420, "TMS2": 5421, "TMS3": 5422, "TMS4": 5423, "TMS5": 5424,
        },
    },
    "pune": {
        "city_id": DEFAULT_CUSTOMER_ID,
        "store_name_map": {
            "TMK5": 4246, "TMK6": 4084, "TMK7": 4247, "TMK8": 4248, "TMK9": 4249,
            "TML1": 4250, "TML5": 4254, "TML6": 4255, "TML7": 4085, "TML8": 4256,
            "TML9": 4257, "TMM1": 4258, "TMM2": 4259, "TMM3": 4260, "TMM4": 4261,
            "TMM5": 4262, "TMM6": 4263, "TMM7": 4264, "TMM8": 4086, "TMM9": 4265,
            "TMN2": 4266, "TMN3": 4267, "TMN4": 4268, "TMN5": 4269, "TMN6": 4270,
            "TPA8": 5035, "TPC1": 5036, "TPC2": 5037, "TPC3": 5038, "TPC4": 5039,
            "TPC5": 5040, "TPC6": 5041, "TPC7": 5042, "TPC8": 5043, "TPC9": 5044,
            "TPD7": 5045, "TPD8": 5046, "TPD9": 5047, "TPE2": 5048, "TPE3": 5049,
            "TPE4": 5050, "TPE5": 5051, "TPE6": 5052, "TPE7": 5053, "TPE8": 5054,
            "TPH1": 5055, "TPH2": 5056, "TPH3": 5057, "TPH4": 5058, "TPH5": 5059,
            "TPH6": 5060, "TPH7": 5061, "TPH8": 5062, "TPH9": 5063, "TPI2": 5064,
            "TPI3": 5065, "TPI4": 5066, "TPI5": 5067, "TPI6": 5068, "TPI7": 5069,
            "TPI8": 5070, "TPI9": 5071, "TPJ1": 5072, "TPJ2": 5073, "TPJ3": 5074,
            "TPJ4": 5075, "TPJ5": 5076, "TPJ6": 5077, "TPJ7": 5078, "TPJ8": 5079,
            "TPJ9": 5080, "TPK1": 5081, "TPK2": 5082, "TPK3": 5083, "TPK4": 5084,
            "TPK5": 5085, "TPK6": 5086, "TPK7": 5087, "TPK8": 5088, "TPK9": 5089,
            "TPR3": 5090, "TPR8": 5091, "TPS2": 5092, "TPS3": 5093, "TPS4": 5094,
            "TPS5": 5095, "TPS6": 5096, "TPS7": 5097, "TPS8": 5098, "TPS9": 5099,
            "TPT1": 5100, "TPT2": 5101, "TPT3": 5102, "TPT4": 5103, "TPT5": 5104,
            "TPT6": 5105, "TPT7": 5106, "TPT8": 5107, "TPT9": 5108, "TPU1": 5109,
            "TPU2": 5110, "TPU3": 5111, "TPU4": 5112, "TPU5": 5113, "TPU6": 5114,
            "TPU7": 5115, "TPU8": 5116, "TPU9": 5117, "TPV1": 5118, "TPV2": 5119,
            "TPV3": 5120, "TPV4": 5121, "TPV5": 5122, "TPV6": 5123, "TPV7": 5124,
        },
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
