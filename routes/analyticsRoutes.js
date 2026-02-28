const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getPerformanceAnalytics } = require("../controllers/analyticsController");

// Token only
router.get("/", protect, getPerformanceAnalytics);

module.exports = router;