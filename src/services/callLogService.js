const { getSheetsClient } = require('../config/googleSheets');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = process.env.GOOGLE_SHEET_RANGE || 'CallLogs!A:H';

/**
 * Formats a Date into the sheet's expected date/time strings.
 *  date -> "22/06/2024"
 *  time -> "02:56 PM"
 */
function formatDateTime(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;

  return {
    date: `${dd}/${mm}/${yyyy}`,
    time: `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`,
  };
}

/**
 * Appends one row to Google Sheets for a completed call.
 * Sheet column order: Date | Time | Shop Name | Address | From Number | To Number | Duration | Shop ID
 */
async function appendCallLog({ shopId, shopName, address, fromNumber, toNumber, durationSeconds, callTimestamp }) {
  const sheets = await getSheetsClient();

  const when = callTimestamp ? new Date(callTimestamp) : new Date();
  const { date, time } = formatDateTime(when);
  const duration = formatDuration(durationSeconds);

  const row = [date, time, shopName, address, fromNumber, toNumber, duration, shopId];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return { date, time, duration };
}

function formatDuration(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

module.exports = { appendCallLog };
