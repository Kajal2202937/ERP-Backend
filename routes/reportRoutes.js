const express = require("express");
const router = express.Router();
const {
  getSalesSummary,
  getSalesTrend,
  getTopProducts,
  getDashboardSummary,
} = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/dashboard/summary", protect, getDashboardSummary);

router.get("/sales", protect, getSalesSummary);
router.get("/sales-trend", protect, getSalesTrend);
router.get("/top-products", protect, getTopProducts);

module.exports = router;
