const shopService = require("../services/shopService");

async function listShops(req, res, next) {
  try {
    const shops = await shopService.getAllShops();
    res.status(200).json({ success: true, data: shops });
  } catch (err) {
    next(err);
  }
}

async function getShop(req, res, next) {
  try {
    const { shopId } = req.params;
    const shop = await shopService.getShopById(shopId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }
    res.status(200).json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
}

async function addShop(req, res, next) {
  try {
    const { name, address, phoneNumber } = req.body;

    const required = { name, address, phoneNumber };
    const missing = Object.entries(required)
      .filter(
        ([, v]) => v === undefined || v === null || String(v).trim() === "",
      )
      .map(([k]) => k);

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
    }

    const shop = await shopService.createShop({ name, address, phoneNumber });
    res
      .status(201)
      .json({ success: true, message: "Shop created", data: shop });
  } catch (err) {
    next(err);
  }
}

module.exports = { listShops, getShop, addShop };
