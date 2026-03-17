# Consolidate Excel to Google Sheets

Reads all `.xlsx` files from a Google Drive folder ("Losses") and consolidates them into a single Google Sheet — each file becomes a separate tab, with a **D-1 date column** appended.

## Files processed

| File | Sheet Tab |
|------|-----------|
| DNE.xlsx | DNE |
| Intransit_Damage.xlsx | Intransit_Damage |
| MAL_FWD.xlsx | MAL_FWD |
| MAL_Reverse_.xlsx | MAL_Reverse_ |
| Manual_TTL.xlsx | Manual_TTL |
| RI_Loss.xlsx | RI_Loss |
| Store_variance.xlsx | Store_variance |
| Summary_Loss_3PL.xlsx | Summary_Loss_3PL |

## Setup

### 1. Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Drive API** and **Google Sheets API**
4. Go to **APIs & Services > Credentials**
5. Create an **OAuth 2.0 Client ID** (Desktop app)
6. Download the credentials JSON and save as `credentials.json` in this directory

### 2. Create Output Google Sheet

1. Create a new blank Google Sheet
2. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DRIVE_FOLDER_ID` — the folder ID from the "Losses" folder URL
- `OUTPUT_SHEET_ID` — the Google Sheet ID from step 2

### 4. Install & Run

```bash
pip install -r requirements.txt
python consolidate_excel.py
```

On first run, a browser window will open for Google OAuth. After authenticating, a `token.json` file is saved for future runs.

## What it does

1. Authenticates with Google APIs (Drive + Sheets)
2. Lists all `.xlsx` files in the specified Drive folder
3. Downloads each file
4. Reads the data using `openpyxl`
5. Appends a **"Date (D-1)"** column with yesterday's date to every row
6. Writes each file's data into a separate tab in the output Google Sheet

## Scheduling (optional)

To run daily, add a cron job:

```bash
# Run every day at 8:00 AM
0 8 * * * cd /path/to/basefile && /path/to/python consolidate_excel.py >> logs/consolidate.log 2>&1
```
