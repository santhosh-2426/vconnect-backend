const express = require("express");
const router = express.Router();

const { getPerformanceAnalytics } = require("../controllers/analyticsController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// 🔐 Protect analytics route (Admin only)
router.get(
  "/",
  protect,
  authorizeRoles("Admin"),
  getPerformanceAnalytics
);

module.exports = router;