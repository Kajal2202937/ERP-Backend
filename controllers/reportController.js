const {
  getSalesSummaryService,
  getSalesTrendService,
  getTopProductsService,
  getDashboardSummaryService,
} = require("../services/reportService");
const asyncHandler = require("../middleware/asyncHandler");

exports.getSalesSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await getSalesSummaryService(startDate, endDate);
  res.json({ success: true, data });
});

exports.getSalesTrend = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await getSalesTrendService(startDate, endDate);
  res.json({ success: true, data });
});

exports.getTopProducts = asyncHandler(async (req, res) => {
  const data = await getTopProductsService();
  res.json({ success: true, data });
});

exports.getDashboardSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await getDashboardSummaryService(from, to);
  res.json({ success: true, data });
});
