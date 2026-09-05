const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/dynamoClient");

const TABLE_NAME = process.env.DYNAMODB_CALLLOGS_TABLE || "CallLogs";

/**
 * DynamoDB "CallLogs" table schema (suggested):
 *   callId          (String, Partition Key) - e.g. "CALL-a1b2c3d4"
 *   shopId          (String)
 *   shopName        (String)
 *   address         (String)
 *   fromNumber      (String)
 *   toNumber        (String)
 *   durationSeconds (Number)
 *   callTimestamp   (String, ISO)
 *   notes           (String)
 *   reminderDate    (String)   - dd/mm/yyyy or ""
 *   salesmanName    (String)
 *   callStatus      (String)
 *   createdAt       (String, ISO timestamp)
 *
 * This mirrors what's written to Google Sheets so DynamoDB always has a
 * durable, queryable copy of every call log independent of the Sheet.
 */
async function saveCallLog({
  shopId,
  shopName,
  address,
  fromNumber,
  toNumber,
  durationSeconds,
  callTimestamp,
  notes,
  reminderDate,
  salesmanName,
  callStatus,
}) {
  const callId = `CALL-${uuidv4().split("-")[0]}`;
  const item = {
    callId,
    shopId,
    shopName,
    address,
    fromNumber,
    toNumber,
    durationSeconds: Math.max(0, Math.floor(durationSeconds || 0)),
    callTimestamp: callTimestamp || new Date().toISOString(),
    notes: notes || "",
    reminderDate: reminderDate || "",
    salesmanName: salesmanName || "",
    callStatus: callStatus || "",
    createdAt: new Date().toISOString(),
  };

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: "attribute_not_exists(callId)",
  });

  await docClient.send(command);
  return item;
}

/**
 * Fetches every item from the CallLogs table, transparently handling
 * DynamoDB's own internal pagination (a single Scan only returns up to
 * ~1MB of data, so a large table needs multiple requests via
 * ExclusiveStartKey/LastEvaluatedKey to retrieve everything).
 */
async function scanAllItems() {
  let items = [];
  let lastEvaluatedKey;

  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey,
    });
    const result = await docClient.send(command);
    items = items.concat(result.Items || []);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

/**
 * Returns call logs, newest first.
 *
 * Pass no arguments (or omit `limit`) to get every call log — this keeps
 * existing callers (like the dashboard, which does its own client-side
 * date-grouping over the full set) working unchanged.
 *
 * Pass `{ limit, offset }` to get one page instead — e.g. `{ limit: 50 }`
 * for the first 50 newest calls, `{ limit: 50, offset: 50 }` for the next
 * 50, and so on. Sorting happens in memory across the *entire* table
 * before paging, so page order is always correct — DynamoDB Scan's own
 * pagination only walks the table in storage order, not by callTimestamp,
 * so paginating with the raw Scan directly would produce out-of-order
 * pages here.
 */
async function getAllCallLogs({ limit, offset } = {}) {
  const items = await scanAllItems();
  items.sort((a, b) => new Date(b.callTimestamp) - new Date(a.callTimestamp));

  if (limit === undefined || limit === null) {
    return { items, total: items.length };
  }

  const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 500);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const page = items.slice(safeOffset, safeOffset + safeLimit);

  return {
    items: page,
    total: items.length,
    limit: safeLimit,
    offset: safeOffset,
    hasMore: safeOffset + safeLimit < items.length,
  };
}

module.exports = { saveCallLog, getAllCallLogs };
