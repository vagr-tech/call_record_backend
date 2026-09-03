const { PutCommand } = require("@aws-sdk/lib-dynamodb");
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

module.exports = { saveCallLog };
