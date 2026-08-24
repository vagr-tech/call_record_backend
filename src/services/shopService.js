const {
  ScanCommand,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/dynamoClient");

const TABLE_NAME = process.env.DYNAMODB_SHOPS_TABLE || "Shops";

/**
 * DynamoDB "Shops" table schema (suggested):
 *   shopId       (String, Partition Key)  - e.g. "SHOP#001"
 *   name         (String)                 - shop name
 *   address      (String)                 - shop address
 *   phoneNumber  (String)                 - shop contact number, e.g. "+919876543210"
 *   createdAt    (String, ISO timestamp)  - optional
 */

async function getAllShops() {
  // For larger datasets, replace Scan with a Query on a GSI, or add pagination.
  const command = new ScanCommand({ TableName: TABLE_NAME });
  const result = await docClient.send(command);
  return result.Items || [];
}

async function getShopById(shopId) {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { shopId },
  });
  const result = await docClient.send(command);
  return result.Item || null;
}

/**
 * Generates a short, human-readable, unique shop id, e.g. "SHOP-a1b2c3d4".
 * Uses a UUID fragment instead of a scan+increment counter so concurrent
 * shop creation never causes a race condition or duplicate id.
 */
function generateShopId() {
  return `SHOP-${uuidv4().split("-")[0]}`;
}

async function createShop({ name, address, phoneNumber }) {
  const shopId = generateShopId();
  const item = {
    shopId,
    name,
    address,
    phoneNumber,
    createdAt: new Date().toISOString(),
  };

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
    // Belt-and-braces: guarantees we never silently overwrite an existing shop
    ConditionExpression: "attribute_not_exists(shopId)",
  });

  await docClient.send(command);
  return item;
}

module.exports = { getAllShops, getShopById, createShop };
