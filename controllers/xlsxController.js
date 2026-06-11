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

const { createOrder } = require("../services/orderService");

const MAX_IMPORT_ROWS = 1000;

const MAX_EXPORT_ROWS = 10_000;

exports.exportSuppliersXlsx = asyncXlsx(async (req, res) => {
  const data = await Supplier.find().limit(MAX_EXPORT_ROWS).lean();
  exportSuppliers(data, res);
});

exports.exportInventoryXlsx = asyncXlsx(async (req, res) => {
  const data = await Inventory.find()
    .populate("product", "name sku category")
    .limit(MAX_EXPORT_ROWS)
    .lean();
  exportInventory(data, res);
});

exports.exportProductsXlsx = asyncXlsx(async (req, res) => {
  const [products, inventory] = await Promise.all([
    Product.find().populate("supplier", "name").limit(MAX_EXPORT_ROWS).lean(),
    Inventory.find().limit(MAX_EXPORT_ROWS).lean(),
  ]);

  const qtyMap = {};
  inventory.forEach((inv) => {
    qtyMap[String(inv.product)] = inv.quantity || 0;
  });

  exportProducts(
    products.map((p) => ({ ...p, quantity: qtyMap[String(p._id)] ?? 0 })),
    res,
  );
});

exports.exportOrdersXlsx = asyncXlsx(async (req, res) => {
  const Order = require("../models/Order");
  const data = await Order.find()
    .populate({
      path: "product",
      populate: { path: "supplier", select: "name" },
    })
    .limit(MAX_EXPORT_ROWS)
    .lean();
  exportOrders(data, res);
});

exports.importProductsXlsx = asyncXlsx(async (req, res) => {
  const products = parseProductImport(req.file.buffer);

  if (products.length > MAX_IMPORT_ROWS) {
    throw new AppError(
      `Import limit is ${MAX_IMPORT_ROWS} rows. Your file has ${products.length} rows. ` +
        `Split into smaller files and import separately.`,
      400,
    );
  }
  if (!products.length) {
    throw new AppError("No valid product rows found in the file", 400);
  }

  const ops = products.map((p) => ({
    updateOne: {
      filter: { $or: [{ sku: p.sku }, { name: p.name }] },
      update: { $setOnInsert: p },
      upsert: true,
    },
  }));

  const bulkResult = await Product.bulkWrite(ops, { ordered: false });

  res.json({
    success: true,
    imported: bulkResult.upsertedCount,
    skipped: bulkResult.matchedCount,
    failed: 0,
    total: products.length,
    message: `${bulkResult.upsertedCount} imported, ${bulkResult.matchedCount} skipped (already exist)`,
  });
});

exports.importSuppliersXlsx = asyncXlsx(async (req, res) => {
  const suppliers = parseSupplierImport(req.file.buffer);

  if (suppliers.length > MAX_IMPORT_ROWS) {
    throw new AppError(
      `Import limit is ${MAX_IMPORT_ROWS} rows. Your file has ${suppliers.length} rows.`,
      400,
    );
  }
  if (!suppliers.length) {
    throw new AppError("No valid supplier rows found in the file", 400);
  }

  const ops = suppliers.map((s) => ({
    updateOne: {
      filter: { email: s.email },
      update: { $setOnInsert: s },
      upsert: true,
    },
  }));

  const bulkResult = await Supplier.bulkWrite(ops, { ordered: false });

  res.json({
    success: true,
    imported: bulkResult.upsertedCount,
    skipped: bulkResult.matchedCount,
    failed: 0,
    total: suppliers.length,
    message: `${bulkResult.upsertedCount} imported, ${bulkResult.matchedCount} skipped (already exist)`,
  });
});

exports.importInventoryXlsx = asyncXlsx(async (req, res) => {
  const rows = parseInventoryImport(req.file.buffer);

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new AppError(
      `Import limit is ${MAX_IMPORT_ROWS} rows. Your file has ${rows.length} rows.`,
      400,
    );
  }
  if (!rows.length) {
    throw new AppError("No valid inventory rows found in the file", 400);
  }

  const skus = [...new Set(rows.map((r) => r.sku).filter(Boolean))];
  const names = [...new Set(rows.map((r) => r.productName).filter(Boolean))];

  const products = await Product.find({
    $or: [
      ...(skus.length ? [{ sku: { $in: skus } }] : []),
      ...(names.length ? [{ name: { $in: names } }] : []),
    ],
  }).lean();

  const bySku = {};
  const byName = {};
  products.forEach((p) => {
    if (p.sku) bySku[p.sku] = p;
    if (p.name) byName[p.name] = p;
  });

  const results = { imported: 0, failed: 0, errors: [] };
  const ops = [];

  for (const row of rows) {
    const product =
      (row.sku && bySku[row.sku]) ||
      (row.productName && byName[row.productName]);
    const id = row.sku || row.productName || "unknown";

    if (!product) {
      results.failed++;
      results.errors.push({ identifier: id, error: "Product not found" });
      continue;
    }

    ops.push({
      updateOne: {
        filter: { product: product._id },
        update: {
          $set: {
            quantity: row.quantity,
            lastUpdated: new Date(),
            ...(row.lowStockLimit !== undefined
              ? { lowStockLimit: row.lowStockLimit }
              : {}),
          },
        },
        upsert: true,
      },
    });
    results.imported++;
  }

  if (ops.length) {
    await Inventory.bulkWrite(ops, { ordered: false });
  }

  res.json({
    success: true,
    imported: results.imported,
    failed: results.failed,
    total: rows.length,
    errors: results.errors,
    message: `${results.imported} rows updated, ${results.failed} failed`,
  });
});

exports.importOrdersXlsx = asyncXlsx(async (req, res) => {
  const orders = parseOrdersImport(req.file.buffer);

  if (orders.length > MAX_IMPORT_ROWS) {
    throw new AppError(
      `Import limit is ${MAX_IMPORT_ROWS} rows. Your file has ${orders.length} rows.`,
      400,
    );
  }
  if (!orders.length) {
    throw new AppError("No valid order rows found in the file", 400);
  }

  const results = { imported: 0, failed: 0, errors: [] };

  for (const row of orders) {
    try {
      await createOrder({
        product: row.product,
        quantity: row.quantity,
        createdBy: req.user._id,
        customer: row.customer || {},
        notes: row.notes || `Imported from XLSX`,
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

  res.json({
    success: true,
    imported: results.imported,
    failed: results.failed,
    total: orders.length,
    errors: results.errors,
    message: `${results.imported} orders imported, ${results.failed} failed`,
  });
});
