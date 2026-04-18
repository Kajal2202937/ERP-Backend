const Order = require("../models/Order");
const Product = require("../models/Product");

const getDateFilter = (startDate, endDate) => {
  const filter = {};

  if (startDate && !isNaN(new Date(startDate))) {
    filter.$gte = new Date(startDate);
  }

  if (endDate && !isNaN(new Date(endDate))) {
    filter.$lte = new Date(endDate);
  }

  return Object.keys(filter).length ? { createdAt: filter } : {};
};

const getSalesSummaryService = async (startDate, endDate) => {
  const match = getDateFilter(startDate, endDate);

  const result = await Order.aggregate([
    { $match: match },

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

    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$revenue" },
        totalCost: { $sum: "$cost" },
      },
    },

    {
      $project: {
        _id: 0,
        totalOrders: 1,
        totalQuantity: 1,
        totalRevenue: 1,

        profit: {
          $subtract: ["$totalRevenue", "$totalCost"],
        },

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
                2,
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
      profitMargin: 0,
    }
  );
};

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

    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },

    { $unwind: "$product" },

    {
      $project: {
        _id: 0,
        productId: "$product._id",
        name: "$product.name",
        category: "$product.category",
        totalSold: 1,
      },
    },
  ]);

  return result;
};

module.exports = {
  getSalesSummaryService,
  getSalesTrendService,
  getTopProductsService,
};
