const express = require("express");
const router = express.Router();

const {
  getSalesSummary,
  getSalesTrend,
  getTopProducts,
} = require("../controllers/reportController");

router.get("/sales", getSalesSummary);
router.get("/sales-trend", getSalesTrend);
router.get("/top-products", getTopProducts);

module.exports = router;