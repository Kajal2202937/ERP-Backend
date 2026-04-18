const Inventory = require("../models/Inventory");
const StockLedger = require("../models/StockLedger");

const updateStock = async ({
  productId,
  quantity,
  type,
  source = "MANUAL",
  referenceId = null,
}) => {
  if (!productId) throw new Error("productId is required");

  const qty = Number(quantity);

  if (isNaN(qty) || qty <= 0) {
    throw new Error("Invalid quantity");
  }

  const normalizedType = type?.toUpperCase()?.trim();

  if (!["IN", "OUT"].includes(normalizedType)) {
    throw new Error("Invalid stock type");
  }

  const inventory = await Inventory.findOne({ product: productId });

  if (!inventory) {
    throw new Error("Inventory not found for product");
  }

  const beforeQty = inventory.quantity;

  let afterQty = beforeQty;

  if (normalizedType === "OUT") {
    if (inventory.quantity < qty) {
      throw new Error("Insufficient stock");
    }

    afterQty = beforeQty - qty;
    inventory.quantity = afterQty;
  } else if (normalizedType === "IN") {
    afterQty = beforeQty + qty;
    inventory.quantity = afterQty;
  }

  inventory.lastUpdated = new Date();

  const saved = await inventory.save();

  try {
    await StockLedger.create({
      product: productId,
      type: normalizedType,
      quantity: qty,
      source,
      referenceId,
      before: beforeQty,
      after: afterQty,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[StockLedger ERROR]", err.message);
  }

  return saved;
};

module.exports = {
  updateStock,
};
