const Order = require("../models/Order");
const { generateFreeInsights } = require("../services/freeInsightsService");
const asyncHandler = require("../middleware/asyncHandler");

exports.getAIInsights = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const query = {};
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const orders = await Order.find(query);

  const raw = generateFreeInsights(orders);

  const insight =
    typeof raw === "string"
      ? raw
          .split("\n")
          .map((l) => l.replace(/^[-•*]\s*/, "").trim())
          .filter(Boolean)
      : Array.isArray(raw)
        ? raw
        : ["No insights available."];

  res.status(200).json({ success: true, data: { insight } });
});
