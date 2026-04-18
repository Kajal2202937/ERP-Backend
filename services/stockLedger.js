const StockLedger = require("../models/StockLedger");

exports.addStockEntry = async ({
  product,
  type,
  quantity,
  source,
  referenceId = null,
  costPrice = 0,
}) => {
  if (!product || !type || !quantity || !source) {
    throw new Error("Missing stock ledger data");
  }

  return await StockLedger.create({
    product,
    type,
    quantity,
    source,
    referenceId,
    costPrice,
  });
};

exports.getStockHistory = async (productId) => {
  return await StockLedger.find({ product: productId })
    .sort({ createdAt: -1 })
    .populate("product", "name sku");
};
