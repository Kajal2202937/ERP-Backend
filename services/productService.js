const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const { updateStock } = require("./stockService");

exports.createProduct = async (data) => {
  const { quantity, ...productData } = data;

  const product = await Product.create(productData);

  const existingInventory = await Inventory.findOne({
    product: product._id,
  });

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
      await updateStock({
        productId: product._id,
        quantity,
        type: "IN",
      });
    }
  }

  return product;
};

exports.getAllProducts = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { category: { $regex: query.search, $options: "i" } },
      { sku: { $regex: query.search, $options: "i" } },
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

  let products = await Product.find(filter)
    .populate("supplier")
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Product.countDocuments(filter);

  const inventory = await Inventory.find({
    product: { $in: products.map((p) => p._id) },
  }).lean();

  const map = {};
  inventory.forEach((inv) => {
    map[inv.product.toString()] = inv;
  });

  products = products.map((p) => {
    const inv = map[p._id.toString()];

    const quantity = inv?.quantity || 0;
    const lowStockLimit = inv?.lowStockLimit || 5;

    return {
      ...p,
      quantity,
      lowStockLimit,
      stockStatus: quantity <= lowStockLimit ? "low" : "available",
    };
  });

  return {
    total,
    page,
    pages: Math.ceil(total / limit),
    data: products,
  };
};

exports.getProductById = async (id) => {
  const product = await Product.findById(id).populate("supplier");

  if (!product) {
    throw new Error("Product not found");
  }

  const inventory = await Inventory.findOne({ product: id });

  return {
    ...product.toObject(),
    quantity: inventory?.quantity || 0,
    lowStockLimit: inventory?.lowStockLimit || 5,
  };
};

exports.updateProduct = async (id, data) => {
  const { quantity, ...productData } = data;

  const product = await Product.findByIdAndUpdate(id, productData, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new Error("Product not found");
  }

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

  if (!product) {
    throw new Error("Product not found");
  }

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
  }).populate("product");

  return inventory.map((item) => ({
    ...item.product.toObject(),
    quantity: item.quantity,
    lowStockLimit: item.lowStockLimit,
    stockStatus: "low",
  }));
};
