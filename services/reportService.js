const Order = require("../models/Order");

// DATE FILTER
const getDateFilter = (startDate, endDate) => {
  if (!startDate || !endDate) return {};
  return {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };
};

// SALES SUMMARY (UPGRADED)
const getSalesSummaryService = async (startDate, endDate) => {
  const match = getDateFilter(startDate, endDate);

  const result = await Order.aggregate([
    { $match: match },

    // CALCULATIONS
    {
      $addFields: {
        revenue: { $ifNull: ["$totalPrice", 0] },

        cost: {
          $multiply: [
            { $ifNull: ["$costPrice", 0] },
            { $ifNull: ["$quantity", 0] },
          ],
        },
      },
    },

    // GROUP TOTALS
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$revenue" },
        totalCost: { $sum: "$cost" },
      },
    },

    // FINAL OUTPUT (WITH PROFIT MARGIN)
    {
      $project: {
        _id: 0,
        totalOrders: 1,
        totalQuantity: 1,
        totalRevenue: 1,

        profit: {
          $subtract: ["$totalRevenue", "$totalCost"],
        },

        // 🔥 NEW: PROFIT MARGIN %
        profitMargin: {
          $cond: [
            { $eq: ["$totalRevenue", 0] },
            0,
            {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: ["$totalRevenue", "$totalCost"],
                        },
                        "$totalRevenue",
                      ],
                    },
                    100,
                  ],
                },
                2, // 2 decimal places
              ],
            },
          ],
        },
      },
    },
  ]);

  return (
    result[0] || {
      totalOrders: 0,
      totalQuantity: 0,
      totalRevenue: 0,
      profit: 0,
      profitMargin: 0, // ✅ added
    }
  );
};

// SALES TREND (UNCHANGED + SAFE)
const getSalesTrendService = async (startDate, endDate) => {
  const match = getDateFilter(startDate, endDate);

  const data = await Order.aggregate([
    { $match: match },

    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        total: { $sum: { $ifNull: ["$totalPrice", 0] } },
      },
    },

    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  return data.map((d) => ({
    date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(
      d._id.day,
    ).padStart(2, "0")}`,
    total: d.total,
  }));
};

// TOP PRODUCTS (UNCHANGED)
const getTopProductsService = async () => {
  const result = await Order.aggregate([
    {
      $group: {
        _id: "$product",
        totalSold: { $sum: "$quantity" },
      },
    },

    { $sort: { totalSold: -1 } },
    { $limit: 5 },
  ]);

  return result;
};

module.exports = {
  getSalesSummaryService,
  getSalesTrendService,
  getTopProductsService,
};
