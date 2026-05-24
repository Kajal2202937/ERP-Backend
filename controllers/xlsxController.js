const asyncXlsx = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const {
  exportSuppliers,
  exportInventory,
  exportProducts,
  exportOrders,
} = require("../utils/xlsx/exporter");

const {
  parseProductImport,
  parseSupplierImport,
  parseInventoryImport,
  parseOrdersImport,
} = require("../utils/xlsx/importer");

const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Order = require("../models/Order");

exports.exportSuppliersXlsx = asyncXlsx(async (req, res) => {
  const data = await Supplier.find().lean();
  exportSuppliers(data, res);
});

exports.exportInventoryXlsx = asyncXlsx(async (req, res) => {
  const data = await Inventory.find()
    .populate("product", "name sku category")
    .lean();

  exportInventory(data, res);
});

exports.exportProductsXlsx = asyncXlsx(async (req, res) => {
  const products = await Product.find().populate("supplier", "name").lean();

  const inventory = await Inventory.find().lean();
  const qtyMap = {};
  inventory.forEach((inv) => {
    qtyMap[String(inv.product)] = inv.quantity || 0;
  });

  const data = products.map((p) => ({
    ...p,
    quantity: qtyMap[String(p._id)] !== undefined ? qtyMap[String(p._id)] : 0,
  }));

  exportProducts(data, res);
});

exports.exportOrdersXlsx = asyncXlsx(async (req, res) => {
  const data = await Order.find()
    .populate({
      path: "product",
      populate: {
        path: "supplier",
        select: "name",
      },
    })
    .lean();

  exportOrders(data, res);
});

exports.importProductsXlsx = asyncXlsx(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please upload an Excel file", 400);
  }

  const products = parseProductImport(req.file.buffer);

  const results = {
    success: true,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const p of products) {
    try {
      const exists = await Product.findOne({
        $or: [{ sku: p.sku }, { name: p.name }],
      });

      if (exists) {
        results.skipped++;
        results.errors.push({
          row: p.name,
          error: "Duplicate product",
        });

        continue;
      }

      await Product.create(p);

      results.imported++;
    } catch (err) {
      results.failed++;

      results.errors.push({
        row: p.name,
        error: err.message,
      });
    }
  }

  res.json(results);
});

exports.importSuppliersXlsx = asyncXlsx(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please upload an Excel file", 400);
  }

  const suppliers = parseSupplierImport(req.file.buffer);

  const results = {
    success: true,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const s of suppliers) {
    try {
      const orConditions = [{ email: s.email }];
      if (s.phone) orConditions.push({ phone: s.phone });
      const exists = await Supplier.findOne({ $or: orConditions });

      if (exists) {
        const reason =
          exists.email === s.email
            ? `Email already exists: ${s.email}`
            : `Phone already exists: ${s.phone}`;
        results.skipped++;
        results.errors.push({ row: s.email, error: reason });
        continue;
      }

      await Supplier.create(s);

      results.imported++;
    } catch (err) {
      results.failed++;

      results.errors.push({
        row: s.email,
        error: err.message,
      });
    }
  }

  res.json(results);
});

exports.importInventoryXlsx = asyncXlsx(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please upload an Excel file", 400);
  }

  const rows = parseInventoryImport(req.file.buffer);

  const results = {
    success: true,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const row of rows) {
    try {
      let product = null;
      if (row.sku) {
        product = await Product.findOne({ sku: row.sku });
      }
      if (!product && row.productName) {
        product = await Product.findOne({ name: row.productName });
      }

      const identifier = row.sku || row.productName || "unknown";

      if (!product) {
        results.failed++;
        results.errors.push({ sku: identifier, error: "Product not found" });
        continue;
      }

      const update = { quantity: row.quantity, lastUpdated: new Date() };
      if (row.lowStockLimit !== undefined) {
        update.lowStockLimit = row.lowStockLimit;
      }

      await Inventory.findOneAndUpdate({ product: product._id }, update, {
        upsert: true,
        new: true,
      });

      results.imported++;
    } catch (err) {
      results.failed++;
      results.errors.push({
        sku: row.sku || row.productName || "unknown",
        error: err.message,
      });
    }
  }

  res.json(results);
});

exports.importOrdersXlsx = asyncXlsx(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please upload an Excel file", 400);
  }

  const orders = parseOrdersImport(req.file.buffer);

  const results = {
    success: true,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const row of orders) {
    try {
      const product = await Product.findOne({
        name: row.product,
      });

      if (!product) {
        results.failed++;

        results.errors.push({
          product: row.product,
          error: "Product not found",
        });

        continue;
      }

      await Order.create({
        product: product._id,
        quantity: row.quantity,
        price: row.price,
        costPrice: row.costPrice,
        totalPrice: row.quantity * row.price,
        status: row.status,
      });

      results.imported++;
    } catch (err) {
      results.failed++;

      results.errors.push({
        product: row.product,
        error: err.message,
      });
    }
  }

  res.json(results);
});
