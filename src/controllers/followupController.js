const followupDismissalService = require("../services/followupDismissalService");

async function listDismissed(req, res, next) {
  try {
    const shopKeys = await followupDismissalService.listDismissedToday();
    res.status(200).json({ success: true, data: shopKeys });
  } catch (err) {
    next(err);
  }
}

async function dismissFollowup(req, res, next) {
  try {
    const { shopKey } = req.body;
    if (!shopKey) {
      return res
        .status(400)
        .json({ success: false, message: "shopKey is required" });
    }
    const result = await followupDismissalService.dismiss(shopKey);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function undismissAll(req, res, next) {
  try {
    await followupDismissalService.undismissAllToday();
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDismissed, dismissFollowup, undismissAll };
