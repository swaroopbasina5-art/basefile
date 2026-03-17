#!/usr/bin/env python3
"""
Consolidate Excel files from Google Drive into a single Google Sheet.

Reads all .xlsx files from a specified Google Drive folder ("Losses"),
writes each file's data into a separate tab in a single Google Sheet,
and adds a D-1 (yesterday's date) column to every sheet.
"""

import io
import os
import sys
from datetime import datetime, timedelta

import openpyxl
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

load_dotenv()

# If modifying these scopes, delete token.json and re-authenticate.
SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
]

DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID", "")
OUTPUT_SHEET_ID = os.getenv("OUTPUT_SHEET_ID", "")
CREDENTIALS_PATH = os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")
TOKEN_PATH = "token.json"


def authenticate():
    """Authenticate with Google APIs using OAuth2 and return credentials."""
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                print(f"ERROR: Credentials file '{CREDENTIALS_PATH}' not found.")
                print("Download it from Google Cloud Console > APIs & Services > Credentials.")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, "w") as token_file:
            token_file.write(creds.to_json())

    return creds


def list_xlsx_files(drive_service, folder_id):
    """List all .xlsx files in the specified Google Drive folder."""
    query = (
        f"'{folder_id}' in parents "
        "and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' "
        "and trashed=false"
    )
    results = drive_service.files().list(
        q=query,
        fields="files(id, name)",
        orderBy="name",
    ).execute()

    files = results.get("files", [])
    print(f"Found {len(files)} .xlsx file(s) in the Drive folder.")
    for f in files:
        print(f"  - {f['name']}")
    return files


def download_file(drive_service, file_id):
    """Download a file from Google Drive and return its bytes."""
    request = drive_service.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)

    done = False
    while not done:
        _, done = downloader.next_chunk()

    buffer.seek(0)
    return buffer


def read_excel_data(file_bytes):
    """Read an Excel file from bytes and return header + rows as lists."""
    wb = openpyxl.load_workbook(file_bytes, read_only=True, data_only=True)
    ws = wb.active

    rows = []
    for row in ws.iter_rows(values_only=True):
        # Convert all values to strings (Google Sheets API expects strings/numbers)
        converted = []
        for cell in row:
            if cell is None:
                converted.append("")
            elif isinstance(cell, datetime):
                converted.append(cell.strftime("%Y-%m-%d %H:%M:%S"))
            else:
                converted.append(cell)
        rows.append(converted)

    wb.close()
    return rows


def clear_existing_sheets(sheets_service, spreadsheet_id):
    """Remove all existing sheets except the first one, then clear the first."""
    spreadsheet = sheets_service.spreadsheets().get(
        spreadsheetId=spreadsheet_id
    ).execute()

    existing_sheets = spreadsheet.get("sheets", [])

    # Delete all sheets except the first one
    requests = []
    for sheet in existing_sheets[1:]:
        requests.append({
            "deleteSheet": {"sheetId": sheet["properties"]["sheetId"]}
        })

    if requests:
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={"requests": requests},
        ).execute()

    # Clear the first sheet
    first_sheet_name = existing_sheets[0]["properties"]["title"]
    sheets_service.spreadsheets().values().clear(
        spreadsheetId=spreadsheet_id,
        range=first_sheet_name,
    ).execute()

    return first_sheet_name


def create_or_rename_sheet(sheets_service, spreadsheet_id, sheet_name, first_sheet_name, is_first):
    """Create a new sheet tab or rename the first sheet."""
    if is_first:
        # Rename the first (existing) sheet
        spreadsheet = sheets_service.spreadsheets().get(
            spreadsheetId=spreadsheet_id
        ).execute()
        first_sheet_id = spreadsheet["sheets"][0]["properties"]["sheetId"]

        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={
                "requests": [{
                    "updateSheetProperties": {
                        "properties": {
                            "sheetId": first_sheet_id,
                            "title": sheet_name,
                        },
                        "fields": "title",
                    }
                }]
            },
        ).execute()
    else:
        # Add a new sheet
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={
                "requests": [{
                    "addSheet": {
                        "properties": {"title": sheet_name}
                    }
                }]
            },
        ).execute()


def write_data_to_sheet(sheets_service, spreadsheet_id, sheet_name, rows):
    """Write rows of data to a specific sheet tab."""
    if not rows:
        print(f"  WARNING: No data found for sheet '{sheet_name}', skipping.")
        return

    sheets_service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=f"'{sheet_name}'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": rows},
    ).execute()

    print(f"  Wrote {len(rows)} rows to sheet '{sheet_name}'.")


def add_date_column(rows, d1_date):
    """Add a D-1 date column to the data. First row gets the header, rest get the date."""
    if not rows:
        return rows

    updated = []
    for i, row in enumerate(rows):
        row_list = list(row)
        if i == 0:
            row_list.append("Date (D-1)")
        else:
            row_list.append(d1_date)
        updated.append(row_list)

    return updated


def main():
    if not DRIVE_FOLDER_ID:
        print("ERROR: DRIVE_FOLDER_ID not set. Check your .env file.")
        sys.exit(1)
    if not OUTPUT_SHEET_ID:
        print("ERROR: OUTPUT_SHEET_ID not set. Check your .env file.")
        sys.exit(1)

    # D-1 = yesterday's date
    d1_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    print(f"D-1 Date: {d1_date}")

    # Authenticate
    print("Authenticating with Google APIs...")
    creds = authenticate()
    drive_service = build("drive", "v3", credentials=creds)
    sheets_service = build("sheets", "v4", credentials=creds)

    # List .xlsx files in the Drive folder
    xlsx_files = list_xlsx_files(drive_service, DRIVE_FOLDER_ID)
    if not xlsx_files:
        print("No .xlsx files found in the specified folder. Exiting.")
        sys.exit(0)

    # Clear existing sheets in the output spreadsheet
    print(f"\nPreparing output Google Sheet...")
    first_sheet_name = clear_existing_sheets(sheets_service, OUTPUT_SHEET_ID)

    # Process each file
    for i, file_info in enumerate(xlsx_files):
        file_name = file_info["name"]
        file_id = file_info["id"]
        # Use file name without extension as the sheet tab name
        sheet_name = os.path.splitext(file_name)[0]

        print(f"\n[{i + 1}/{len(xlsx_files)}] Processing: {file_name}")

        # Download the file
        print(f"  Downloading...")
        file_bytes = download_file(drive_service, file_id)

        # Read Excel data
        print(f"  Reading Excel data...")
        rows = read_excel_data(file_bytes)

        # Add D-1 date column
        rows = add_date_column(rows, d1_date)

        # Create/rename sheet tab
        create_or_rename_sheet(
            sheets_service, OUTPUT_SHEET_ID,
            sheet_name, first_sheet_name, is_first=(i == 0),
        )

        # Write data
        write_data_to_sheet(sheets_service, OUTPUT_SHEET_ID, sheet_name, rows)

    print(f"\nDone! All {len(xlsx_files)} files consolidated.")
    print(f"View your Google Sheet: https://docs.google.com/spreadsheets/d/{OUTPUT_SHEET_ID}/edit")


if __name__ == "__main__":
    main()
