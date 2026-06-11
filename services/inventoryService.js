const mongoose = require("mongoose");
const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const { updateStock: stockEngine } = require("./stockService");
const AppError = require("../utils/AppError");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.createInventory = async (data) => {
  if (!data.product) throw new AppError("Product is required", 400);

  const existing = await Inventory.findOne({ product: data.product });
  if (existing)
    throw new AppError("Inventory already exists for this product", 409);

  return await Inventory.create({
    product: data.product,
    quantity: Number(data.quantity) || 0,
    isActive: true,
    lowStockLimit: data.lowStockLimit || 5,
    location: data.location || "Main Warehouse",
    lastUpdated: new Date(),
  });
};

exports.getInventory = async (query) => {
  if (query.mode === "dropdown" || query.all === "true") {
    const inv = await Inventory.find({ archived: { $ne: true } })
      .populate("product", "_id name sku status")
      .sort({ "product.name": 1 })
      .lean();

    return {
      data: inv,
      total: inv.length,
      page: 1,
      totalPages: 1,
    };
  }

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 1000);
  const skip = (page - 1) * limit;
  const search = query.search?.trim();

  const match = { archived: { $ne: true } };

  if (query.stock === "out") match.quantity = 0;
  if (query.status === "active") match.isActive = true;
  if (query.status === "disabled") match.isActive = false;

  const matchStages = [
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

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
                { location: { $regex: escapeRegex(search), $options: "i" } },
              ],
            },
          },
        ]
      : []),

    { $match: match },
  ];

  const pipeline = [...matchStages];

  if (query.stock === "low") {
    pipeline.push({
      $match: {
        $expr: {
          $and: [
            { $gt: ["$quantity", 0] },
            { $lte: ["$quantity", "$lowStockLimit"] },
          ],
        },
      },
    });
  }

  const [result] = await Inventory.aggregate([
    ...pipeline,
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const totalCount = result?.total?.[0]?.count ?? 0;

  const allInventory = await Inventory.find({
    archived: { $ne: true },
  }).lean();

  const summary = {
    total: allInventory.length,
    lowStock: allInventory.filter(
      (item) => item.quantity > 0 && item.quantity <= item.lowStockLimit,
    ).length,
    outOfStock: allInventory.filter((item) => item.quantity === 0).length,
    active: allInventory.filter((item) => item.isActive).length,
  };

  return {
    data: result?.data ?? [],
    total: totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
    summary,
  };
};

exports.addStock = async (productId, qty) => {
  const quantity = Number(qty);
  if (!productId) throw new AppError("productId is required", 400);
  if (isNaN(quantity) || quantity <= 0)
    throw new AppError("Invalid quantity", 400);

  const inventory = await Inventory.findOne({ product: productId });
  if (!inventory) {
    return await Inventory.create({
      product: productId,
      quantity,
      isActive: true,
      lastUpdated: new Date(),
    });
  }

  await stockEngine({ productId, quantity, type: "IN" });
  return await Inventory.findOne({ product: productId });
};

exports.updateStock = async (productId, qty) => {
  const quantity = Number(qty);
  if (!productId) throw new AppError("productId is required", 400);
  if (isNaN(quantity) || quantity < 0)
    throw new AppError("Invalid quantity", 400);

  const inventory = await Inventory.findOne({ product: productId });
  if (!inventory) throw new AppError("Inventory not found", 404);

  const diff = quantity - inventory.quantity;
  if (diff === 0) return inventory;

  await stockEngine({
    productId,
    quantity: Math.abs(diff),
    type: diff > 0 ? "IN" : "OUT",
  });
  return await Inventory.findOne({ product: productId });
};

exports.disableInventory = async (productId) => {
  if (!productId) throw new AppError("productId is required", 400);
  const inventory = await Inventory.findOneAndUpdate(
    { product: productId },
    { isActive: false, lastUpdated: new Date() },
    { new: true },
  );
  if (!inventory) throw new AppError("Inventory not found", 404);
  return inventory;
};

exports.enableInventory = async (productId) => {
  if (!productId) throw new AppError("productId is required", 400);
  const inventory = await Inventory.findOneAndUpdate(
    { product: productId },
    { isActive: true, lastUpdated: new Date() },
    { new: true },
  );
  if (!inventory) throw new AppError("Inventory not found", 404);
  return inventory;
};

exports.deleteInventory = async (productIds) => {
  const ids = Array.isArray(productIds) ? productIds : [productIds];
  if (!ids.length) throw new AppError("productIds required", 400);

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validIds.length)
    throw new AppError("No valid product IDs provided", 400);

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      await Inventory.updateMany(
        { product: { $in: validIds } },
        { $set: { isActive: false, archived: true, lastUpdated: new Date() } },
        { session },
      );

      result = await Product.deleteMany(
        { _id: { $in: validIds } },
        { session },
      );
    });
  } finally {
    session.endSession();
  }

  return {
    inventoryArchived: validIds.length,
    productsDeleted: result?.deletedCount ?? 0,
  };
};
