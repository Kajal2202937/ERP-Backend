const productionService = require("../services/productionService");
const productionReportService = require("../services/productionReportService");
const asyncHandler4 = require("../middleware/asyncHandler");

exports.getProductionReport = asyncHandler4(async (req, res) => {
  const { startDate, endDate } = req.query;

  const result = await productionReportService.getProductionReportData(
    startDate,
    endDate,
  );
  res.json({ success: true, ...result });
});

exports.createProduction = asyncHandler4(async (req, res) => {
  const data = await productionService.createProduction(req.body);
  res.status(201).json({ success: true, data });
});

exports.getProductions = asyncHandler4(async (req, res) => {
  const data = await productionService.getProductions();
  res.json({ success: true, data });
});

exports.updateProduction = asyncHandler4(async (req, res) => {
  const data = await productionService.updateProduction(
    req.params.id,
    req.body,
  );
  res.json({ success: true, data });
});

exports.deleteProduction = asyncHandler4(async (req, res) => {
  await productionService.deleteProduction(req.params.id);
  res.json({
    success: true,
    message: "Production record deleted successfully",
  });
});
