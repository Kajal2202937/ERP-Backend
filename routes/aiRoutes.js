const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const ai = require("../controllers/aiController");
const { protect, authorize } = require("../middleware/authMiddleware");

const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many AI chat requests. Please wait a few minutes and try again.",
  },
});

const insightsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many AI analysis requests. Please wait before requesting more insights.",
  },
});

router.post("/chat", protect, chatLimiter, ai.assistantChat);

router.get("/insights", protect, insightsLimiter, ai.getBusinessInsights);

router.get(
  "/invoice/:id/summary",
  protect,
  authorize("admin", "manager"),
  insightsLimiter,
  ai.summariseInvoice,
);

router.post(
  "/invoice/:id/email",
  protect,
  authorize("admin", "manager"),
  insightsLimiter,
  ai.generateInvoiceEmail,
);

router.get(
  "/supplier/:id/analysis",
  protect,
  authorize("admin", "manager"),
  insightsLimiter,
  ai.analyseSupplier,
);

router.get(
  "/suppliers/risk-report",
  protect,
  authorize("admin"),
  insightsLimiter,
  ai.supplierRiskReport,
);

module.exports = router;
