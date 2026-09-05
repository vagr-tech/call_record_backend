const express = require("express");
const {
  createCallLog,
  listCallLogs,
} = require("../controllers/callLogController");

const router = express.Router();

router.get("/", listCallLogs); // GET  /api/call-logs
router.post("/", createCallLog); // POST /api/call-logs

module.exports = router;
