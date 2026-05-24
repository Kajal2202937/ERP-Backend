const {
  getSalesSummaryService,
  getSalesTrendService,
  getTopProductsService,
} = require("../services/reportService");
const asyncHandler5 = require("../middleware/asyncHandler");

exports.getSalesSummary = asyncHandler5(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await getSalesSummaryService(startDate, endDate);
  res.json({ success: true, data });
});

exports.getSalesTrend = asyncHandler5(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await getSalesTrendService(startDate, endDate);
  res.json({ success: true, data });
});

exports.getTopProducts = asyncHandler5(async (req, res) => {
  const data = await getTopProductsService();
  res.json({ success: true, data });
});
