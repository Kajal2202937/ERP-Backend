const reportService = require("../services/reportService");
const Order = require("../models/Order");

// ---------------- SALES ----------------
exports.getSalesReport = async (req, res) => {
  try {
    const data = await reportService.getSalesSummary(
      req.query.startDate,
      req.query.endDate
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------- TREND ----------------
exports.getSalesTrend = async (req, res) => {
  try {
    const data = await reportService.getSalesTrend(
      req.query.startDate,
      req.query.endDate
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------- INSIGHTS ----------------
exports.getInsights = async (req, res) => {
  try {
    const top = await reportService.getTopProduct();

    res.json({
      success: true,
      data: top ? `Top selling product is ${top.product.name}` : "No data",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------- TOP PRODUCTS (FIXED) ----------------
exports.getTopProducts = async (req, res) => {
  try {
    const data = await Order.aggregate([
      {
        $group: {
          _id: "$product",
          totalSold: { $sum: "$quantity" },
        },
      },

      { $sort: { totalSold: -1 } },
      { $limit: 10 },

      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },

      {
        $addFields: {
          productDetails: { $arrayElemAt: ["$productDetails", 0] },
        },
      },

      {
        $project: {
          _id: 0,
          name: "$productDetails.name",
          totalSold: 1,
        },
      },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};