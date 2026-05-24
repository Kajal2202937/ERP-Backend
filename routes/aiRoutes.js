const express = require("express");
const router = express.Router();
const ai = require("../controllers/aiController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/chat", protect, ai.assistantChat);
router.get("/insights", protect, ai.getBusinessInsights);
router.get("/invoice/:id/summary", protect, ai.summariseInvoice);
router.post("/invoice/:id/email", protect, ai.generateInvoiceEmail);
router.get(
  "/supplier/:id/analysis",
  protect,
  authorize("admin", "manager"),
  ai.analyseSupplier,
);
router.get(
  "/suppliers/risk-report",
  protect,
  authorize("admin"),
  ai.supplierRiskReport,
);

module.exports = router;
