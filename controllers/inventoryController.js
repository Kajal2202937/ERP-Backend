const inventoryService = require("../services/inventoryService");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

exports.createInventory = asyncHandler(async (req, res) => {
  const data = await inventoryService.createInventory(req.body);
  res.status(201).json({ success: true, data });
});

exports.getInventory = asyncHandler(async (req, res) => {
  const result = await inventoryService.getInventory(req.query);
  res.json({ success: true, ...result });
});

exports.addStock = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || quantity === undefined)
    throw new AppError("productId and quantity are required", 400);
  const data = await inventoryService.addStock(productId, quantity);
  res.json({ success: true, data });
});

exports.updateStock = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || quantity === undefined)
    throw new AppError("productId and quantity are required", 400);
  const data = await inventoryService.updateStock(productId, quantity);
  res.json({ success: true, data });
});

exports.disableInventory = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new AppError("productId is required", 400);
  const data = await inventoryService.disableInventory(productId);
  res.json({ success: true, data });
});

exports.enableInventory = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new AppError("productId is required", 400);
  const data = await inventoryService.enableInventory(productId);
  res.json({ success: true, data });
});

exports.deleteInventory = asyncHandler(async (req, res) => {
  const { productIds } = req.body;
  if (!productIds?.length)
    throw new AppError("productIds array is required", 400);
  const data = await inventoryService.deleteInventory(productIds);
  res.json({ success: true, data });
});
