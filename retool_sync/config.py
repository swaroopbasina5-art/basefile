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
    "delhi": {
        "city_id": DEFAULT_CUSTOMER_ID,
        "store_name_map": {
            "TDA1": 3629, "TDA2": 3630, "TDA3": 3631, "TDA4": 3632, "TDA5": 3633,
            "TDA6": 3713, "TDA7": 3825, "TDA8": 4045, "TDA9": 4070, "TDB1": 3852,
            "TDB2": 3826, "TDB3": 4139, "TDB4": 3827, "TDB5": 4071, "TDB6": 3837,
            "TDB7": 3990, "TDB8": 3991, "TDB9": 3992, "TDC1": 4051, "TDC5": 4142,
            "TDC6": 4143, "TDC7": 4144, "TDC9": 4146, "TDD1": 4147, "TDD2": 4148,
            "TDD3": 4072, "TDD4": 4149, "TDD5": 4150, "TDD6": 4151, "TDD7": 4152,
            "TDD8": 4153, "TDD9": 4154, "TDE1": 4155, "TDE2": 4156, "TDE3": 4157,
            "TDF1": 4159, "TDF2": 4160, "TDF3": 4161, "TDF4": 4162, "TDF5": 4163,
            "TDF6": 4164, "TDF7": 4165, "TDF8": 4166, "TDF9": 4074, "TDG4": 4167,
            "TDG5": 4168, "TDG6": 4169, "TDG7": 4170, "TDG8": 4171, "TDG9": 4172,
            "TDH1": 3993, "TDH2": 3994, "TDH3": 4044, "TDH5": 4052, "TDH6": 4173,
            "TDH7": 4174, "TDH8": 4175, "TDH9": 4075, "TDI1": 4176, "TDI2": 4177,
            "TDI3": 4178, "TDI4": 4179, "TDI5": 4180, "TDI6": 4181, "TDI7": 4182,
            "TDI8": 4183, "TDI9": 4184, "TDJ1": 4076, "TDJ2": 4185, "TDK7": 4198,
            "TDL6": 5375, "TDL7": 5376, "TDL8": 5377, "TDL9": 5378, "TDM1": 5379,
            "TDM2": 5380, "TDM3": 5381, "TDM4": 5382, "TDM5": 5383, "TDM6": 5384,
            "TDM7": 5385, "TDM8": 5386, "TDM9": 5387, "TNB4": 4271, "TND7": 4277,
            "TDO1": 5948, "TDO2": 5949, "TDO3": 5950, "TDO4": 5951, "TDO5": 5952,
            "TDO6": 5953, "TDO7": 5954, "TDO8": 5955, "TDO9": 5956, "TDP1": 5957,
            "TDP2": 5958, "TDP3": 5959, "TDP4": 5960, "TDP5": 5961, "TDP6": 5962,
            "TDP7": 5963, "TDP8": 5964, "TDP9": 5965, "TDQ1": 5966, "TDQ2": 5967,
            "TDQ3": 5968, "TDQ4": 5969, "TDQ5": 5970, "TDQ6": 5971, "TDQ7": 5972,
            "TDQ8": 5973, "TDQ9": 5974, "TDR1": 5975, "TDR2": 5976, "TDR3": 5977,
            "TDR4": 5978, "TDR5": 5979, "TDR6": 5980, "TDR7": 5981, "TDR8": 5982,
            "TDR9": 5983, "TDS1": 5984, "TDS2": 5985, "TDS3": 5986, "TDS4": 5987,
            "TDS5": 5988, "TDS6": 5989, "TDS7": 5990, "TDS8": 5991, "TDS9": 5992,
            "TDT1": 5993, "TDT2": 5994, "TDT3": 5995, "TDT4": 5996, "TDT5": 5997,
            "TDT6": 5998, "TDT7": 5999, "TDT8": 6000, "TDT9": 6001, "TDU1": 6002,
            "TDU2": 6003, "TDU3": 6004, "TDU4": 6005, "TDU5": 6006, "TDU6": 6007,
            "TDU7": 6008, "TDU8": 6009, "TDU9": 6010, "TDV1": 6011, "TDV2": 6012,
            "TDV4": 6013, "TDV5": 6014, "TDV6": 6015, "TDV7": 6016, "TDV8": 6017,
            "TDV9": 6018, "TDW1": 6019, "TDW2": 6020, "TDW3": 6021, "TDW4": 6022,
            "TDW5": 6023, "TDW7": 6024, "TDW8": 6025, "TDW9": 6026, "TDX1": 6027,
            "TDX2": 6028, "TDX3": 6029, "TDX4": 6030, "TDX5": 6031, "TDX6": 6032,
            "TDX7": 6033, "TDX8": 6034, "TDX9": 6035, "TDY1": 6036, "TDY2": 6037,
            "TDY3": 6038, "TDY4": 6039, "TDY5": 6040, "TDY6": 6041, "TDY7": 6042,
            "TDY8": 6043, "TDY9": 6044, "TZA1": 5350, "TZA2": 5351,
        },
    },
    "gurgaon": {
        "city_id": DEFAULT_CUSTOMER_ID,
        "store_name_map": {
            "TDC2": 4140, "TDH4": 4047, "TDJ5": 4188, "TDJ7": 4190, "TDJ8": 4191,
            "TDJ9": 4192, "TDK2": 4077, "TDK4": 4195, "TDK5": 4196, "TDK8": 4199,
            "TDK9": 5541, "TFA2": 5325, "TFA3": 5326, "TFA5": 5328, "TFA6": 5329,
            "TSA8": 3839, "TSA9": 3997, "TSB1": 3998, "TSB2": 4091, "TSB3": 4296,
            "TSE1": 4297, "TSE3": 4092, "TSE4": 4299, "TSE6": 4300, "TSE7": 4301,
            "TSF1": 3834, "TSF2": 3835, "TSF3": 4303, "TSF5": 4305, "TSF8": 4093,
            "TSF9": 3999, "TSG3": 4000, "TSG4": 4308, "TSG5": 4309, "TSG6": 4310,
            "TSG7": 4311, "TSG8": 4312, "TSG9": 4313, "TSH3": 4315,
        },
    },
    "noida": {
        "city_id": DEFAULT_CUSTOMER_ID,
        "store_name_map": {
            "TDC8": 4145, "TDE4": 4073, "TDN1": 5388, "TDN2": 5389, "TNA3": 3828,
            "TNA4": 3829, "TNA5": 3830, "TNA6": 3831, "TNA7": 3832, "TNA8": 3833,
            "TNA9": 3836, "TNB3": 4087, "TND1": 4272, "TND2": 4088, "TND3": 4273,
            "TND4": 4274, "TND5": 4275, "TND6": 4276, "TND8": 4278, "TND9": 4279,
            "TNE1": 4280, "TNE2": 4281, "TNE3": 4089, "TNE4": 4282, "TNE5": 4283,
            "TNE6": 4284, "TNE7": 4285, "TNE8": 3995, "TNE9": 3996, "TNF1": 4043,
            "TNF2": 4046, "TNF3": 4286, "TNF5": 4287, "TNF6": 4288, "TNF7": 4289,
            "TNF8": 4290, "TNF9": 4090, "TNG5": 4291, "TNG6": 4292, "TNG7": 4293,
            "TNG8": 4294, "TNG9": 4295, "TZA3": 5352, "TZA4": 5353, "TZA5": 5354,
            "TZA6": 5355, "TZA7": 5356, "TZA8": 5357, "TZA9": 5358, "TZB1": 5359,
            "TZB2": 5360, "TZB3": 5361, "TZB4": 5362, "TZB5": 5363, "TZB6": 5364,
            "TZB7": 5365, "TZB8": 5366, "TZB9": 5367, "TZC1": 5368, "TZC2": 5369,
            "TZC3": 5370, "TZC4": 5371, "TZC5": 5372, "TZC6": 5373, "TZC7": 5374,
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
