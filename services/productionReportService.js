const reportService = require("../services/productionReportService");

exports.getProductionReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await reportService.getProductionReportData(
      startDate,
      endDate,
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
