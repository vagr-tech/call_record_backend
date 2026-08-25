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
 *
 * Duration is sent as a real number (fraction of a day, e.g. 47 seconds ->
 * 47/86400) instead of a "00:47" string, so pivot tables can SUM it
 * correctly. Format the Duration column with a custom number format of
 * "[h]:mm:ss" (or "[m]:ss" for minutes:seconds only) in Google Sheets so it
 * still *displays* as a duration — the square brackets let totals exceed
 * 24 hours / 60 minutes without wrapping around, which is what you want
 * for a summed column.
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
  const safeDurationSeconds = Math.max(0, Math.floor(durationSeconds || 0));
  const durationDayFraction = safeDurationSeconds / 86400; // Sheets duration/time serial unit

  const row = [
    date,
    time,
    shopName,
    address,
    fromNumber,
    toNumber,
    durationDayFraction,
    shopId,
    notes || "",
    reminderDate || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
    // RAW: our formatted strings (date/time) go in exactly as sent — no
    // re-parsing surprises. The Duration value above is a genuine JS
    // number, so it still lands in the sheet as a real, summable number
    // even under RAW (RAW only affects how *strings* are interpreted).
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return {
    date,
    time,
    duration: formatDuration(safeDurationSeconds),
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
