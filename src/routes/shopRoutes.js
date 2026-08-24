const express = require("express");
const {
  listShops,
  getShop,
  addShop,
} = require("../controllers/shopController");

const router = express.Router();

router.get("/", listShops); // GET  /api/shops
router.get("/:shopId", getShop); // GET  /api/shops/:shopId
router.post("/", addShop); // POST /api/shops  (auto-generates shopId)

module.exports = router;
