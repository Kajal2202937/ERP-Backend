const Order = require("../models/Order");
const { generateFreeInsights } = require("../services/freeInsightsService");

exports.getAIInsights = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await Order.find(query);

    const insight = generateFreeInsights(orders);

    res.status(200).json({
      success: true,
      data: insight,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate insights",
    });
  }
};
