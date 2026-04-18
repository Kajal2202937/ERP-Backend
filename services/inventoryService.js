const Inventory = require("../models/Inventory");
const { updateStock: stockEngine } = require("./stockService");

exports.createInventory = async (data) => {
  if (!data.product) throw new Error("Product is required");

  const existing = await Inventory.findOne({ product: data.product });

  if (existing) {
    throw new Error("Inventory already exists for this product");
  }

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
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const search = query.search?.trim();

  const match = {
    archived: { $ne: true },
  };

  if (query.stock === "low") {
    match.quantity = { $gt: 0, $lte: 10 };
  }

  if (query.stock === "out") {
    match.quantity = 0;
  }

  if (query.status === "active") {
    match.isActive = true;
  }

  if (query.status === "disabled") {
    match.isActive = false;
  }

  const pipeline = [
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
                { "product.name": { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),

    { $match: match },

    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const data = await Inventory.aggregate(pipeline);

  const totalResult = await Inventory.aggregate([
    ...pipeline.slice(0, -3),
    { $count: "total" },
  ]);

  const total = totalResult[0]?.total || 0;

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

exports.addStock = async (productId, qty) => {
  const quantity = Number(qty);

  if (!productId) throw new Error("productId is required");
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error("Invalid quantity");
  }

  const inventory = await Inventory.findOne({ product: productId });

  if (!inventory) {
    return await Inventory.create({
      product: productId,
      quantity,
      isActive: true,
      lastUpdated: new Date(),
    });
  }

  await stockEngine({
    productId,
    quantity,
    type: "IN",
  });

  return await Inventory.findOne({ product: productId });
};

exports.updateStock = async (productId, qty) => {
  const quantity = Number(qty);

  if (!productId) throw new Error("productId is required");
  if (isNaN(quantity) || quantity < 0) {
    throw new Error("Invalid quantity");
  }

  const inventory = await Inventory.findOne({ product: productId });

  if (!inventory) throw new Error("Inventory not found");

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
  if (!productId) throw new Error("productId is required");

  const inventory = await Inventory.findOneAndUpdate(
    { product: productId },
    { isActive: false, lastUpdated: new Date() },
    { new: true },
  );

  if (!inventory) throw new Error("Inventory not found");

  return inventory;
};

exports.enableInventory = async (productId) => {
  if (!productId) throw new Error("productId is required");

  const inventory = await Inventory.findOneAndUpdate(
    { product: productId },
    { isActive: true, lastUpdated: new Date() },
    { new: true },
  );

  if (!inventory) throw new Error("Inventory not found");

  return inventory;
};

exports.deleteInventory = async (productIds) => {
  const ids = Array.isArray(productIds) ? productIds : [productIds];

  if (!ids.length) throw new Error("productIds required");

  return await Inventory.updateMany(
    { product: { $in: ids } },
    {
      $set: {
        isActive: false,
        archived: true,
        lastUpdated: new Date(),
      },
    },
  );
};
