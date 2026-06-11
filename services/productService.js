const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const { updateStock } = require("./stockService");
const AppError = require("../utils/AppError");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.createProduct = async (data) => {
  const { quantity, ...productData } = data;

  const product = await Product.create(productData);

  const existingInventory = await Inventory.findOne({ product: product._id });

  if (!existingInventory) {
    await Inventory.create({
      product: product._id,
      quantity: Number(quantity) || 0,
      lowStockLimit: 5,
      location: "Main Warehouse",
      isActive: true,
    });
  } else {
    if (quantity && quantity > 0) {
      await updateStock({ productId: product._id, quantity, type: "IN" });
    }
  }

  return product;
};

exports.getAllProducts = async (query) => {
  if (query.mode === "dropdown" || query.all === "true") {
    const dropdownFilter = {};

    if (query.status !== "all") {
      dropdownFilter.status = "active";
    }

    if (query.search) {
      const safe = escapeRegex(query.search);
      dropdownFilter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { sku: { $regex: safe, $options: "i" } },
      ];
    }

    const [result] = await Product.aggregate([
      { $match: dropdownFilter },
      { $sort: { name: 1 } },

      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product",
          as: "inventory",
        },
      },
      {
        $addFields: {
          inventoryDoc: { $arrayElemAt: ["$inventory", 0] },
        },
      },
      {
        $addFields: {
          quantity: { $ifNull: ["$inventoryDoc.quantity", 0] },
          lowStockLimit: { $ifNull: ["$inventoryDoc.lowStockLimit", 5] },
          stockStatus: {
            $cond: [
              {
                $lte: ["$inventoryDoc.quantity", "$inventoryDoc.lowStockLimit"],
              },
              "low",
              "available",
            ],
          },
        },
      },
      { $unset: ["inventory", "inventoryDoc"] },

      {
        $facet: {
          data: [],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const data = result?.data || [];
    return {
      data,
      total: data.length,
      page: 1,
      pages: 1,
    };
  }

  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 10, 10000);
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.search) {
    const safe = escapeRegex(query.search);
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { category: { $regex: safe, $options: "i" } },
      { sku: { $regex: safe, $options: "i" } },
    ];
  }

  if (query.category) filter.category = query.category;

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  const sortField = query.sortField || "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const [result] = await Product.aggregate([
    { $match: filter },
    { $sort: { [sortField]: sortOrder } },

    {
      $lookup: {
        from: "suppliers",
        localField: "supplier",
        foreignField: "_id",
        as: "supplierData",
      },
    },
    {
      $addFields: {
        supplier: { $arrayElemAt: ["$supplierData", 0] },
      },
    },
    { $unset: "supplierData" },

    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "product",
        as: "inventory",
      },
    },
    {
      $addFields: {
        inventoryDoc: { $arrayElemAt: ["$inventory", 0] },
      },
    },
    {
      $addFields: {
        quantity: { $ifNull: ["$inventoryDoc.quantity", 0] },
        lowStockLimit: { $ifNull: ["$inventoryDoc.lowStockLimit", 5] },
        stockStatus: {
          $cond: [
            { $lte: ["$inventoryDoc.quantity", "$inventoryDoc.lowStockLimit"] },
            "low",
            "available",
          ],
        },
      },
    },
    { $unset: ["inventory", "inventoryDoc"] },

    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const total = result?.total?.[0]?.count || 0;

  return {
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    data: result?.data || [],
  };
};

exports.getProductById = async (id) => {
  const product = await Product.findById(id).populate("supplier");
  if (!product) throw new AppError("Product not found", 404);

  const inventory = await Inventory.findOne({ product: id });

  return {
    ...product.toObject(),
    quantity: inventory?.quantity || 0,
    lowStockLimit: inventory?.lowStockLimit || 5,
  };
};

exports.updateProduct = async (id, data) => {
  const { quantity, ...rawData } = data;

  const productData = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined),
  );

  if (rawData.supplier === null) productData.supplier = null;

  if (!Object.keys(productData).length && quantity === undefined) {
    throw new AppError("No valid fields provided to update", 400);
  }

  const product = await Product.findByIdAndUpdate(
    id,
    { $set: productData },
    { new: true, runValidators: false },
  ).populate("supplier");

  if (!product) throw new AppError("Product not found", 404);

  if (quantity !== undefined) {
    const inventory = await Inventory.findOne({ product: id });

    if (!inventory) {
      await Inventory.create({
        product: id,
        quantity: Number(quantity),
        lowStockLimit: 5,
        location: "Main Warehouse",
        isActive: true,
      });
    } else {
      const diff = Number(quantity) - inventory.quantity;
      if (diff !== 0) {
        await updateStock({
          productId: id,
          quantity: Math.abs(diff),
          type: diff > 0 ? "IN" : "OUT",
        });
      }
    }
  }

  return product;
};

exports.deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw new AppError("Product not found", 404);

  await Inventory.findOneAndUpdate(
    { product: id },
    { isActive: false, archived: true },
  );
  await Product.findByIdAndDelete(id);

  return true;
};

exports.getLowStockProducts = async () => {
  const inventory = await Inventory.find({
    $expr: { $lte: ["$quantity", "$lowStockLimit"] },
    archived: { $ne: true },
  }).populate("product");

  return inventory
    .filter((item) => item.product != null)
    .map((item) => ({
      ...item.product.toObject(),
      quantity: item.quantity,
      lowStockLimit: item.lowStockLimit,
      stockStatus: "low",
    }));
};
