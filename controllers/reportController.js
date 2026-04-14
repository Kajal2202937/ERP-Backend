const {
  getSalesSummaryService,
  getSalesTrendService,
  getTopProductsService,
} = require("../services/reportService");

exports.getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await getSalesSummaryService(startDate, endDate);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSalesTrend = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await getSalesTrendService(startDate, endDate);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const data = await getTopProductsService();

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
