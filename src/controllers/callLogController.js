const callLogService = require("../services/callLogService");

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

    const result = await callLogService.appendCallLog({
      shopId,
      shopName,
      address,
      fromNumber,
      toNumber,
      durationSeconds: durationSeconds || 0,
      callTimestamp,
      notes,
      reminderDate,
    });

    res
      .status(201)
      .json({ success: true, message: "Call log recorded", data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCallLog };
