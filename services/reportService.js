const Order = require("../models/Order");

const getDateFilter = (startDate, endDate) => {
  if (!startDate || !endDate) return {};
  return {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };
};

exports.getSalesSummary = async (startDate, endDate) => {
  const match = getDateFilter(startDate, endDate);

  const result = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$totalPrice" },
      },
    },
  ]);

  return (
    result[0] || {
      totalOrders: 0,
      totalQuantity: 0,
      totalRevenue: 0,
    }
  );
};

exports.getSalesTrend = async (startDate, endDate) => {
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
        total: { $sum: "$totalPrice" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  return data.map((d) => ({
    date: `${d._id.year}-${d._id.month}-${d._id.day}`,
    total: d.total,
  }));
};

exports.getTopProduct = async () => {
  const result = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        totalSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
  ]);

  return result[0] || null;
};