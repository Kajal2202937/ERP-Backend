const Order = require("../models/Order");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Supplier = require("../models/Supplier");
const Ticket = require("../models/Ticket");
const { getRedisClient } = require("../config/redis");

const TTL = {
  DASHBOARD: 5 * 60,
  SALES: 5 * 60,
  TREND: 5 * 60,
  PRODUCTS: 10 * 60,
};

const withCache = async (key, ttlSeconds, computeFn) => {
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "cache-get-failed",
          key,
          error: err.message,
          ts: new Date().toISOString(),
        }),
      );
    }
  }

  const result = await computeFn();

  if (redis) {
    redis.setEx(key, ttlSeconds, JSON.stringify(result)).catch((err) => {
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "cache-set-failed",
          key,
          error: err.message,
          ts: new Date().toISOString(),
        }),
      );
    });
  }

  return result;
};

const invalidateDashboardCache = async () => {
  const redis = getRedisClient();
  if (!redis) return;

  const patterns = [
    "report:sales:*",
    "report:trend:*",
    "report:top-products",
    "dashboard:summary*",
  ];

  try {
    for (const pattern of patterns) {
      if (!pattern.includes("*")) {
        await redis.del(pattern).catch(() => {});
        continue;
      }

      let cursor = 0;
      do {
        const reply = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        if (reply.keys.length) await redis.del(reply.keys);
      } while (cursor !== 0);
    }
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "cache-invalidation-failed",
        error: err.message,
        ts: new Date().toISOString(),
      }),
    );
  }
};

const getDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate && !isNaN(new Date(startDate))) {
    filter.$gte = new Date(startDate);
  }
  if (endDate && !isNaN(new Date(endDate))) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.$lte = end;
  }
  return Object.keys(filter).length ? { createdAt: filter } : {};
};

const getSalesSummaryService = async (startDate, endDate) => {
  const cacheKey = `report:sales:${startDate || "all"}:${endDate || "all"}`;

  return withCache(cacheKey, TTL.SALES, async () => {
    const dateFilter = getDateFilter(startDate, endDate);

    const match = {
      ...dateFilter,
      status: { $in: ["pending", "completed"] },
    };

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
          profit: { $subtract: ["$totalRevenue", "$totalCost"] },
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
                          { $subtract: ["$totalRevenue", "$totalCost"] },
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
  });
};

const getSalesTrendService = async (startDate, endDate) => {
  const cacheKey = `report:trend:${startDate || "all"}:${endDate || "all"}`;

  return withCache(cacheKey, TTL.TREND, async () => {
    const dateFilter = getDateFilter(startDate, endDate);
    const match = {
      ...dateFilter,
      status: { $in: ["pending", "completed"] },
    };

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
      date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
      total: d.total,
    }));
  });
};

const getTopProductsService = async () => {
  return withCache("report:top-products", TTL.PRODUCTS, async () => {
    return Order.aggregate([
      { $match: { status: { $in: ["pending", "completed"] } } },
      { $group: { _id: "$product", totalSold: { $sum: "$quantity" } } },
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
  });
};

const getDashboardSummaryService = async (startDate, endDate) => {
  const cacheKey = `dashboard:summary:${startDate || "all"}:${endDate || "all"}`;

  return withCache(cacheKey, TTL.DASHBOARD, async () => {
    const dateFilter = getDateFilter(startDate, endDate);

    const orderMatch = {
      ...dateFilter,
      status: { $in: ["pending", "completed"] },
    };

    const trendCreatedAt = Object.keys(dateFilter).length
      ? dateFilter.createdAt
      : { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) };

    const [
      salesResult,
      trendResult,
      topProductsResult,
      inventoryResult,
      supplierResult,
      ticketResult,
    ] = await Promise.all([
      Order.aggregate([
        { $match: orderMatch },
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
            profit: { $subtract: ["$totalRevenue", "$totalCost"] },
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
                            { $subtract: ["$totalRevenue", "$totalCost"] },
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
      ]),

      Order.aggregate([
        {
          $match: {
            status: { $in: ["pending", "completed"] },
            createdAt: trendCreatedAt,
          },
        },
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
      ]),

      Order.aggregate([
        { $match: orderMatch },
        { $group: { _id: "$product", totalSold: { $sum: "$quantity" } } },
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
      ]),

      Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$quantity" },
            lowStock: {
              $sum: { $cond: [{ $lt: ["$quantity", "$lowStockLimit"] }, 1, 0] },
            },
            activeItems: { $sum: { $cond: ["$isActive", 1, 0] } },
          },
        },
        { $project: { _id: 0, totalStock: 1, lowStock: 1, activeItems: 1 } },
      ]),

      Product.aggregate([
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "product",
            as: "inv",
          },
        },
        { $unwind: { path: "$inv", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$supplier",
            value: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$price", 0] },
                  { $ifNull: ["$inv.quantity", 0] },
                ],
              },
            },
            quantity: { $sum: { $ifNull: ["$inv.quantity", 0] } },
          },
        },
        { $sort: { value: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "suppliers",
            localField: "_id",
            foreignField: "_id",
            as: "supplier",
          },
        },
        { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ["$supplier.name", "Unknown"] },
            value: 1,
            quantity: 1,
          },
        },
      ]),

      Ticket.countDocuments({
        status: { $in: ["new", "open", "in_progress"] },
      }),
    ]);

    const sales = salesResult[0] || {
      totalOrders: 0,
      totalQuantity: 0,
      totalRevenue: 0,
      profit: 0,
      profitMargin: 0,
    };

    const trend = trendResult.map((d) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
      total: d.total,
    }));

    const inventory = inventoryResult[0] || {
      totalStock: 0,
      lowStock: 0,
      activeItems: 0,
    };

    return {
      sales,
      trend,
      topProducts: topProductsResult,
      inventory,
      topSuppliers: supplierResult,
      openTickets: ticketResult,
    };
  });
};

module.exports = {
  getSalesSummaryService,
  getSalesTrendService,
  getTopProductsService,
  getDashboardSummaryService,
  invalidateDashboardCache,
};
