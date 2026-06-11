const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const { updateStock } = require("./stockService");
const AppError = require("../utils/AppError");
const { getRedisClient } = require("../config/redis");

const { invalidateDashboardCache } = require("./reportService");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ORDERS_TTL = 30;

const withOrdersCache = async (key, computeFn) => {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch {}
  }
  const result = await computeFn();
  if (redis) {
    redis.setEx(key, ORDERS_TTL, JSON.stringify(result)).catch(() => {});
  }
  return result;
};

const invalidateOrdersCache = async () => {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    let cursor = 0;
    do {
      const reply = await redis.scan(cursor, {
        MATCH: "orders:list:*",
        COUNT: 100,
      });
      cursor = reply.cursor;
      if (reply.keys.length) await redis.del(reply.keys);
    } while (cursor !== 0);
  } catch {}
};

const invalidateAllCaches = async () => {
  await Promise.all([invalidateOrdersCache(), invalidateDashboardCache()]);
};

const createOrder = async (data) => {
  const { product, quantity, createdBy, customer, notes } = data;

  if (!product || !quantity)
    throw new AppError("Product and quantity are required", 400);
  if (!createdBy) throw new AppError("createdBy (user ID) is required", 400);
  if (!mongoose.Types.ObjectId.isValid(product))
    throw new AppError("Invalid product ID", 400);

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty))
    throw new AppError("Quantity must be a positive whole number", 400);

  const productData = await Product.findById(product);
  if (!productData) throw new AppError("Product not found", 404);
  if (productData.costPrice == null)
    throw new AppError(
      "Product cost price is missing. Please update the product first.",
      400,
    );

  const inventorySnapshot = await Inventory.findOne({
    product: productData._id,
  });
  if (!inventorySnapshot)
    throw new AppError("Inventory record not found for this product", 404);
  if (inventorySnapshot.quantity < qty)
    throw new AppError(
      `Insufficient stock. Available: ${inventorySnapshot.quantity}, Requested: ${qty}`,
      400,
    );

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const [created] = await Order.create(
        [
          {
            product: productData._id,
            quantity: qty,
            price: productData.price,
            costPrice: productData.costPrice,
            totalPrice: productData.price * qty,
            status: "pending",
            createdBy,
            customer: customer || {},
            notes: notes || "",
            statusHistory: [
              {
                status: "pending",
                changedBy: createdBy,
                changedAt: new Date(),
                note: "Order created",
              },
            ],
          },
        ],
        { session },
      );
      order = created;

      await updateStock({
        productId: productData._id,
        quantity: qty,
        type: "OUT",
        source: "ORDER",
        referenceId: order._id,
        session,
      });
    });
  } finally {
    session.endSession();
  }

  await invalidateAllCaches();

  return order;
};

const getOrders = async (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 1000);
  const skip = (page - 1) * limit;
  const search = query.search?.trim();
  const status = query.status?.trim() || null;

  const cacheKey = `orders:list:p${page}:l${limit}:s${status || "all"}:q${search || ""}`;

  return withOrdersCache(cacheKey, async () => {
    const earlyMatch = {};
    if (status) earlyMatch.status = status;

    const pipeline = [
      ...(Object.keys(earlyMatch).length ? [{ $match: earlyMatch }] : []),

      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } },

      {
        $lookup: {
          from: "suppliers",
          localField: "product.supplier",
          foreignField: "_id",
          as: "product.supplier",
        },
      },
      {
        $unwind: {
          path: "$product.supplier",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          createdBy: {
            _id: "$createdBy._id",
            name: "$createdBy.name",
            email: "$createdBy.email",
            role: "$createdBy.role",
          },
          profit: {
            $round: [
              {
                $multiply: [
                  { $subtract: ["$price", "$costPrice"] },
                  "$quantity",
                ],
              },
              2,
            ],
          },

          marginPercent: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: [
                      { $eq: ["$price", 0] },
                      0,
                      {
                        $divide: [
                          { $subtract: ["$price", "$costPrice"] },
                          "$price",
                        ],
                      },
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    "product.name": {
                      $regex: escapeRegex(search),
                      $options: "i",
                    },
                  },
                  {
                    orderNumber: { $regex: escapeRegex(search), $options: "i" },
                  },
                  {
                    "customer.name": {
                      $regex: escapeRegex(search),
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),

      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ];

    const [result] = await Order.aggregate(pipeline);

    return {
      data: result?.data || [],
      total: result?.meta?.[0]?.total || 0,
      page,
      pages: Math.ceil((result?.meta?.[0]?.total || 0) / limit) || 1,
    };
  });
};

const getOrderById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError("Invalid order ID", 400);

  const order = await Order.findById(id)
    .populate({
      path: "product",
      populate: { path: "supplier", select: "name email phone" },
    })
    .populate("createdBy", "name email role");

  if (!order) throw new AppError("Order not found", 404);
  return order;
};

const updateOrderStatus = async (id, status, changedBy, note = "") => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError("Invalid order ID", 400);

  const allowed = ["pending", "completed", "cancelled"];
  if (!allowed.includes(status))
    throw new AppError(
      `Invalid status. Must be one of: ${allowed.join(", ")}`,
      400,
    );

  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  if (order.status === status) return order;

  if (order.status !== "cancelled" && status === "cancelled") {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await updateStock({
          productId: order.product,
          quantity: order.quantity,
          type: "IN",
          source: "ORDER_CANCEL",
          referenceId: order._id,
          session,
        });

        const previousStatus = order.status;
        order.status = status;
        order.statusHistory.push({
          status,
          changedBy,
          changedAt: new Date(),
          note: note || `Status changed from ${previousStatus} to ${status}`,
        });
        await order.save({ session });
      });
    } finally {
      session.endSession();
    }

    await invalidateAllCaches();
    return order;
  }

  const previousStatus = order.status;
  order.status = status;
  order.statusHistory.push({
    status,
    changedBy,
    changedAt: new Date(),
    note: note || `Status changed from ${previousStatus} to ${status}`,
  });
  await order.save();

  await invalidateAllCaches();
  return order;
};

const deleteOrder = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError("Invalid order ID", 400);

  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== "cancelled") {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await updateStock({
          productId: order.product,
          quantity: order.quantity,
          type: "IN",
          source: "ORDER_DELETE",
          referenceId: order._id,
          session,
        });
        await Order.findByIdAndDelete(id, { session });
      });
    } finally {
      session.endSession();
    }

    await invalidateAllCaches();
    return { message: "Order deleted and stock restored" };
  }

  await Order.findByIdAndDelete(id);

  await invalidateAllCaches();
  return {
    message: "Order deleted (stock was already restored at cancellation)",
  };
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
};
