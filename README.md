# Shop Caller — Backend (Node.js / Express)

REST API that:

- Serves shop list/details from **AWS DynamoDB**
- Logs completed calls (date, time, shop name, address, from/to number, duration) to **Google Sheets**
- Ready to deploy on **Render**

## Folder structure

```
backend/
  server.js                 # entrypoint
  src/
    app.js                  # express app + middleware + routes mount
    config/
      dynamoClient.js       # AWS DynamoDB client
      googleSheets.js       # Google Sheets auth client
    controllers/
      shopController.js
      callLogController.js
    services/
      shopService.js        # DynamoDB queries
      callLogService.js     # Sheets append logic + formatting
    routes/
      shopRoutes.js
      callLogRoutes.js
    middleware/
      errorHandler.js
    utils/
      logger.js
```

## 1. DynamoDB table

Create a table named `Shops` (or set `DYNAMODB_SHOPS_TABLE`):
| Attribute | Type | Notes |
|---------------|--------|--------------------------|
| shopId | String | Partition key |
| name | String | Shop name |
| address | String | Shop address |
| phoneNumber | String | e.g. `+919876543210` |

Create an IAM user with `AmazonDynamoDBReadOnlyAccess` (or scoped policy) and use its keys in `.env`.

## 2. Google Sheets

1. Create a Google Sheet, add header row: `Date | Time | Shop Name | Address | From Number | To Number | Duration | Shop ID`
2. Create a Google Cloud service account, enable **Google Sheets API**, generate a JSON key.
3. Share the sheet with the service account's `client_email` (Editor access).
4. Base64 encode the JSON key: `base64 -w0 service-account.json` and put it in `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`.
5. Copy the sheet ID from its URL into `GOOGLE_SHEET_ID`.

## 3. Local setup

```bash
cp .env.example .env      # fill in real values
npm install
npm run dev                # nodemon, http://localhost:5000
```

## 4. API

- `GET /api/shops` → list all shops
- `GET /api/shops/:shopId` → single shop
- `POST /api/call-logs` → body:

```json
{
  "shopId": "SHOP#001",
  "shopName": "Sri Lakshmi Stores",
  "address": "12 Main Rd, Madurai",
  "fromNumber": "+919000000000",
  "toNumber": "+919876543210",
  "durationSeconds": 47,
  "callTimestamp": "2024-06-22T14:56:00.000Z"
}
```

## 5. Deploy to Render

1. Push this `backend/` folder to a GitHub repo.
2. Render → New → Web Service → connect the repo.
3. Root directory: `backend` (if repo has both backend + flutter_app folders).
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all variables from `.env.example` under Render → Environment.
7. Deploy — Render gives you a URL like `https://shop-caller-backend.onrender.com`. Use this as `baseUrl` in the Flutter app.

Note: Render's free tier spins down after inactivity; first call after idle can take ~30-50s to wake up.
