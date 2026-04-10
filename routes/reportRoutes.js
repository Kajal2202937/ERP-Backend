const express = require("express");
const router = express.Router();

const reportController = require("../controllers/reportController");

router.get("/sales", reportController.getSalesReport);
router.get("/sales-trend", reportController.getSalesTrend);
router.get("/insights", reportController.getInsights);
router.get("/top-products", reportController.getTopProducts);

module.exports = router;