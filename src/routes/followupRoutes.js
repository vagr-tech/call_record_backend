const express = require("express");
const {
  listDismissed,
  dismissFollowup,
  undismissAll,
} = require("../controllers/followupController");

const router = express.Router();

router.get("/dismissed", listDismissed); // GET  /api/followups/dismissed
router.post("/dismiss", dismissFollowup); // POST /api/followups/dismiss  { shopKey }
router.post("/undismiss-all", undismissAll); // POST /api/followups/undismiss-all

module.exports = router;
