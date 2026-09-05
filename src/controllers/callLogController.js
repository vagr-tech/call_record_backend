const callLogService = require("../services/callLogService");
const callLogDynamoService = require("../services/callLogDynamoService");
const logger = require("../utils/logger");

async function createCallLog(req, res, next) {
  try {
    const {
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
    } = req.body;

    // Basic validation
    const required = { shopId, shopName, address, fromNumber, toNumber };
    const missing = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || v === "")
      .map(([k]) => k);

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
    }

    // Notes cap (defense in depth — client already enforces 200 words)
    if (notes && String(notes).trim().split(/\s+/).length > 200) {
      return res.status(400).json({
        success: false,
        message: "Notes must be 200 words or fewer",
      });
    }

    const payload = {
      shopId,
      shopName,
      address,
      fromNumber,
      toNumber,
      durationSeconds: durationSeconds || 0,
      callTimestamp,
      notes,
      reminderDate,
      salesmanName,
      callStatus,
    };

    // Write to Google Sheets and DynamoDB independently — one failing
    // shouldn't block the other, since they're separate destinations for
    // the same record.
    const [sheetsResult, dynamoResult] = await Promise.allSettled([
      callLogService.appendCallLog(payload),
      callLogDynamoService.saveCallLog(payload),
    ]);

    if (sheetsResult.status === "rejected") {
      logger.error("Failed to write call log to Google Sheets", {
        error: sheetsResult.reason?.message,
      });
    }
    if (dynamoResult.status === "rejected") {
      logger.error("Failed to write call log to DynamoDB", {
        error: dynamoResult.reason?.message,
      });
    }

    // Only a total failure (neither destination succeeded) is an error
    // response — a partial failure still returns success with a note, so
    // the client doesn't retry and create a duplicate in whichever
    // destination *did* succeed.
    if (
      sheetsResult.status === "rejected" &&
      dynamoResult.status === "rejected"
    ) {
      return res.status(502).json({
        success: false,
        message: "Failed to save call log to Google Sheets or DynamoDB",
      });
    }

    res.status(201).json({
      success: true,
      message: "Call log recorded",
      data:
        sheetsResult.status === "fulfilled"
          ? sheetsResult.value
          : dynamoResult.value,
      savedTo: {
        googleSheets: sheetsResult.status === "fulfilled",
        dynamoDB: dynamoResult.status === "fulfilled",
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listCallLogs(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const result = await callLogDynamoService.getAllCallLogs({ limit, offset });

    // `data` always holds the array (matches the previous shape when no
    // pagination params are given). Pagination metadata is only included
    // when `limit` was actually requested, so existing callers (like the
    // dashboard) see no change in response shape.
    const response = { success: true, data: result.items };
    if (limit !== undefined) {
      response.total = result.total;
      response.limit = result.limit;
      response.offset = result.offset;
      response.hasMore = result.hasMore;
    }

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

module.exports = { createCallLog, listCallLogs };
