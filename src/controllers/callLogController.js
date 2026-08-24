const callLogService = require('../services/callLogService');

async function createCallLog(req, res, next) {
  try {
    const { shopId, shopName, address, fromNumber, toNumber, durationSeconds, callTimestamp } = req.body;

    // Basic validation
    const required = { shopId, shopName, address, fromNumber, toNumber };
    const missing = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`,
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
    });

    res.status(201).json({ success: true, message: 'Call log recorded', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCallLog };
