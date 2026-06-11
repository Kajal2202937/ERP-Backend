const supplierService = require("../services/supplierService");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

exports.createSupplier = asyncHandler(async (req, res) => {
  const data = await supplierService.createSupplier(req.body);
  res.status(201).json({ success: true, data });
});

exports.getSuppliers = asyncHandler(async (req, res) => {
  const result = await supplierService.getSuppliers(req.query);
  res.json({ success: true, data: result });
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const data = await supplierService.updateSupplier(req.params.id, req.body);
  res.json({ success: true, data });
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  await supplierService.deleteSupplier(req.params.id);
  res.json({ success: true, message: "Supplier deleted successfully" });
});

exports.bulkDeleteSuppliers = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError("No supplier IDs provided", 400);
  }
  await supplierService.bulkDelete(ids);
  res.json({ success: true, message: "Suppliers deleted successfully" });
});

exports.toggleSupplierStatus = asyncHandler(async (req, res) => {
  const data = await supplierService.toggleStatus(req.params.id);
  res.json({ success: true, data });
});

exports.getSupplierAnalytics = asyncHandler(async (req, res) => {
  const data = await supplierService.getSupplierAnalytics();
  res.json({ success: true, data });
});
