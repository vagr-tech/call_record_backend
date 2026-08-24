const express = require("express");
const { createCallLog } = require("../controllers/callLogController");

const router = express.Router();

router.post("/", createCallLog); // POST /api/call-logs

module.exports = router;
