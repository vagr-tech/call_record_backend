const { getSheetsClient } = require("../config/googleSheets");

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = process.env.GOOGLE_SHEET_RANGE || "CallLogs!A:H";

/**
 * Formats a Date into the sheet's expected date/time strings, always in
 * IST (Asia/Kolkata) regardless of the server's own timezone. Render (and
 * most cloud hosts) run Node in UTC by default, so without this the sheet
 * would show times ~5:30 hours behind actual Indian time.
 *  date -> "22/06/2024"
 *  time -> "02:56 PM"
 */
function formatDateTime(date) {
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // en-GB gives "22/06/2024" (dd/mm/yyyy) directly.
  const formattedDate = dateFormatter.format(date);

  // en-US gives something like "2:56 PM" — normalize to "02:56 PM".
  const rawTime = timeFormatter.format(date);
  const match = rawTime.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
  const formattedTime = match
    ? `${match[1].padStart(2, "0")}:${match[2]} ${match[3].toUpperCase()}`
    : rawTime;

  return { date: formattedDate, time: formattedTime };
}

/**
 * Appends one row to Google Sheets for a completed call.
 * Sheet column order: Date | Time | Shop Name | Address | From Number | To Number | Duration | Shop ID | Notes | Reminder
 */
async function appendCallLog({
  shopId,
  shopName,
  address,
  fromNumber,
  toNumber,
  durationSeconds,
  callTimestamp,
  notes,
  reminderDate,
}) {
  const sheets = await getSheetsClient();

  const when = callTimestamp ? new Date(callTimestamp) : new Date();
  const { date, time } = formatDateTime(when);
  const duration = formatDuration(durationSeconds);

  const row = [
    date,
    time,
    shopName,
    address,
    fromNumber,
    toNumber,
    duration,
    shopId,
    notes || "",
    reminderDate || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
    // RAW (not USER_ENTERED) so Sheets stores our formatted strings exactly
    // as sent — e.g. "02:56 PM" — instead of re-parsing them as a time
    // value and redisplaying with the column's own (24-hour) number format.
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return {
    date,
    time,
    duration,
    notes: notes || "",
    reminderDate: reminderDate || "",
  };
}

function formatDuration(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

module.exports = { appendCallLog };
