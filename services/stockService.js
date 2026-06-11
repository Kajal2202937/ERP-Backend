const Inventory = require("../models/Inventory");
const StockLedger = require("../models/StockLedger");
const AppError = require("../utils/AppError");

/**
 * Atomically update stock using MongoDB findOneAndUpdate.
 *
 * ATOMIC RACE-CONDITION FIX (already in place):
 * Uses a single conditional DB operation:
 *   filter: { product, quantity: { $gte: qty } }   ← only matches if stock exists
 *   update: { $inc: { quantity: -qty } }            ← decrements atomically
 * Two concurrent requests cannot both pass — MongoDB document-level locking
 * guarantees only one wins. No read-then-write window.
 *
 * TRANSACTION FIX (new):
 * Accepts an optional `session` parameter so this function can participate in
 * a multi-document transaction started by the caller (orderService.createOrder,
 * updateOrderStatus, deleteOrder). When a session is passed, both the Order
 * write and this Inventory write commit or roll back together — no orphaned
 * orders, no phantom stock deductions if the process crashes mid-operation.
 *
 * @param {Object} params
 * @param {string|ObjectId} params.productId
 * @param {number}          params.quantity
 * @param {"IN"|"OUT"}      params.type
 * @param {string}          [params.source="MANUAL"]
 * @param {ObjectId|null}   [params.referenceId=null]
 * @param {ClientSession}   [params.session=null]  — MongoDB session for transactions
 */
const updateStock = async ({
  productId,
  quantity,
  type,
  source = "MANUAL",
  referenceId = null,
  session = null,
}) => {
  if (!productId) throw new AppError("productId is required", 400);

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) throw new AppError("Invalid quantity", 400);

  const normalizedType = type?.toUpperCase()?.trim();
  if (!["IN", "OUT"].includes(normalizedType))
    throw new AppError("Invalid stock type. Must be IN or OUT", 400);

  const mongooseOpts = {
    new: false,
    runValidators: true,
    ...(session ? { session } : {}),
  };

  let updatedInventory;

  if (normalizedType === "OUT") {
    updatedInventory = await Inventory.findOneAndUpdate(
      {
        product: productId,
        quantity: { $gte: qty },
        isActive: true,
        archived: { $ne: true },
      },
      {
        $inc: { quantity: -qty },
        $set: { lastUpdated: new Date() },
      },
      mongooseOpts,
    );

    if (!updatedInventory) {
      const inv = await Inventory.findOne(
        { product: productId },
        null,
        session ? { session } : {},
      );
      if (!inv) throw new AppError("Inventory not found for product", 404);
      if (!inv.isActive || inv.archived)
        throw new AppError("Inventory is disabled or archived", 400);
      throw new AppError(
        `Insufficient stock. Available: ${inv.quantity}, Requested: ${qty}`,
        400,
      );
    }
  } else {
    updatedInventory = await Inventory.findOneAndUpdate(
      { product: productId },
      {
        $inc: { quantity: qty },
        $set: { lastUpdated: new Date() },
      },
      mongooseOpts,
    );

    if (!updatedInventory)
      throw new AppError("Inventory not found for product", 404);
  }

  const beforeQty = updatedInventory.quantity;
  const afterQty = normalizedType === "OUT" ? beforeQty - qty : beforeQty + qty;

  const ledgerData = {
    product: productId,
    type: normalizedType,
    quantity: qty,
    source,
    referenceId,
    before: beforeQty,
    after: afterQty,
  };

  const writeLedgerWithRetry = async (data, attempt = 1) => {
    try {
      await StockLedger.create(data);
    } catch (err) {
      if (attempt >= 3) {
        console.error(
          JSON.stringify({
            level: "error",
            msg: "stockledger-write-failed-permanently",
            error: err.message,
            productId: String(productId),
            ledgerData: data,
            ts: new Date().toISOString(),
          }),
        );
        return;
      }
      const delay = 100 * Math.pow(2, attempt - 1);
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "stockledger-write-retrying",
          attempt,
          delay,
          error: err.message,
          productId: String(productId),
          ts: new Date().toISOString(),
        }),
      );
      await new Promise((res) => setTimeout(res, delay));
      return writeLedgerWithRetry(data, attempt + 1);
    }
  };

  writeLedgerWithRetry(ledgerData);

  return Inventory.findOne(
    { product: productId },
    null,
    session ? { session } : {},
  );
};

module.exports = { updateStock };
