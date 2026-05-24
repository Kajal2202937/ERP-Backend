const express8 = require("express");
const router8 = express8.Router();
const {
  getSalesSummary,
  getSalesTrend,
  getTopProducts,
} = require("../controllers/reportController");
const { protect: p8 } = require("../middleware/authMiddleware");

router8.get("/sales", p8, getSalesSummary);
router8.get("/sales-trend", p8, getSalesTrend);
router8.get("/top-products", p8, getTopProducts);

module.exports = router8;
