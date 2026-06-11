const productionService = require("../services/productionService");
const productionReportService = require("../services/productionReportService");
const asyncHandler = require("../middleware/asyncHandler");

exports.getProductionReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await productionReportService.getProductionReportData(
    startDate,
    endDate,
  );
  res.json({ success: true, ...result });
});

exports.createProduction = asyncHandler(async (req, res) => {
  const data = await productionService.createProduction(req.body);
  res.status(201).json({ success: true, data });
});

exports.getProductions = asyncHandler(async (req, res) => {
  const result = await productionService.getProductions(req.query);
  res.json({ success: true, ...result });
});

exports.updateProduction = asyncHandler(async (req, res) => {
  const data = await productionService.updateProduction(
    req.params.id,
    req.body,
  );
  res.json({ success: true, data });
});

exports.deleteProduction = asyncHandler(async (req, res) => {
  await productionService.deleteProduction(req.params.id);
  res.json({
    success: true,
    message: "Production record deleted successfully",
  });
});
