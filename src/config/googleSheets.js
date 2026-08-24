const { google } = require('googleapis');

/**
 * Builds an authenticated Google Sheets client using a service-account.
 * The service account JSON is stored base64-encoded in an env var so it can
 * be pasted safely into Render's environment variable UI (no newline issues).
 */
async function getSheetsClient() {
  const base64Creds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!base64Creds) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is not set');
  }

  const credentialsJson = Buffer.from(base64Creds, 'base64').toString('utf-8');
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

module.exports = { getSheetsClient };
