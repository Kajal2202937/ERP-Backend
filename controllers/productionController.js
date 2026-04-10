const productionService = require("../services/productionService");
const reportService = require("../services/productionReportService");

// ---------------- REPORT ----------------
exports.getProductionReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    await reportService.generateProductionReport(startDate, endDate, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// CREATE
exports.createProduction = async (req, res) => {
  try {
    const data = await productionService.createProduction(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET ALL
exports.getProductions = async (req, res) => {
  try {
    const data = await productionService.getProductions();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
exports.updateProduction = async (req, res) => {
  try {
    const data = await productionService.updateProduction(
      req.params.id,
      req.body,
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
exports.deleteProduction = async (req, res) => {
  try {
    await productionService.deleteProduction(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
