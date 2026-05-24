const Production = require("../models/Production");
const AppError = require("../utils/AppError");

exports.getProductionReportData = async (startDate, endDate) => {
  const match = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      throw new AppError(
        "Invalid date format. Use ISO 8601 (e.g. 2024-01-01)",
        400,
      );
    }

    match.createdAt = { $gte: start, $lte: end };
  }

  const productions = await Production.find(match)
    .populate("product", "name category")
    .sort({ createdAt: -1 })
    .lean();

  const total = productions.length;
  const totalProduced = productions.reduce(
    (sum, p) => sum + (p.quantityProduced || 0),
    0,
  );

  const byStatus = productions.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const completedProductions = productions.filter(
    (p) => p.status === "completed",
  );
  const completedQty = completedProductions.reduce(
    (sum, p) => sum + (p.quantityProduced || 0),
    0,
  );

  return {
    total,
    totalProduced,
    completedQty,
    byStatus,
    data: productions,
  };
};
