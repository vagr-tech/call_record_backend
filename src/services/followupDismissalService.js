const {
  UpdateCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/dynamoClient");

const TABLE_NAME = process.env.DYNAMODB_FOLLOWUPS_TABLE || "FollowupDismissals";

/**
 * DynamoDB "FollowupDismissals" table schema — deliberately tiny:
 *   date            (String, Partition Key) - "yyyy-mm-dd" in IST
 *   dismissedShops  (String Set) - shopIds/names marked done that day
 *
 * ONE ROW PER DAY, not one row per dismissal — "mark done" just adds a
 * shopKey into that day's set. This is completely separate from the
 * CallLogs table/Google Sheet: dismissing a follow-up here never creates,
 * edits, or touches any call-log entry. It's purely "hide this from
 * today's follow-up list, for everyone", nothing more.
 */

function todayIstDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

async function dismiss(shopKey) {
  const date = todayIstDateKey();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { date },
      UpdateExpression: "ADD dismissedShops :s",
      ExpressionAttributeValues: { ":s": new Set([shopKey]) },
    }),
  );
  return { date, shopKey };
}

async function listDismissedToday() {
  const date = todayIstDateKey();
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { date } }),
  );
  const shops = result.Item?.dismissedShops;
  return shops ? Array.from(shops) : [];
}

async function undismissAllToday() {
  const date = todayIstDateKey();
  await docClient.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { date } }),
  );
}

module.exports = { dismiss, listDismissedToday, undismissAllToday };
