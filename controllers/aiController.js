const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const {
  erpAssistantChat,
  generateBusinessInsights,
} = require("../services/ai/analyticsAI");
const {
  summariseInvoice,
  generateInvoiceEmail,
} = require("../services/ai/invoiceAI");
const {
  analyseSupplier,
  bulkSupplierRisk,
} = require("../services/ai/supplierAI");

const Order = require("../models/Order");
const Supplier = require("../models/Supplier");

const {
  getSalesSummaryService,
  getSalesTrendService,
  getTopProductsService,
} = require("../services/reportService");

exports.assistantChat = asyncHandler(async (req, res) => {
  const { history = [], context = {} } = req.body;

  if (!Array.isArray(history))
    throw new AppError("history must be an array", 400);
  if (history.length === 0) throw new AppError("history cannot be empty", 400);

  const reply = await erpAssistantChat(history, context);

  res.json({ success: true, data: { reply } });
});

exports.getBusinessInsights = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const [summary, topProducts, trend] = await Promise.all([
    getSalesSummaryService(startDate, endDate),
    getTopProductsService(),
    getSalesTrendService(startDate, endDate),
  ]);

  const raw = await generateBusinessInsights({ summary, topProducts, trend });

  let insight;
  if (Array.isArray(raw)) {
    insight = raw.filter((s) => typeof s === "string" && s.trim());
  } else if (typeof raw === "string" && raw.trim()) {
    insight = raw
      .split("\n")
      .map((line) => line.replace(/^[-•*#]+\s*/, "").trim())
      .filter(Boolean);
  } else {
    insight = ["AI insights temporarily unavailable."];
  }

  res.json({ success: true, data: { insight, summary, topProducts, trend } });
});

exports.summariseInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate({
    path: "product",
    populate: { path: "supplier", select: "name email phone" },
  });
  if (!order) throw new AppError("Order not found", 404);

  const summary = await summariseInvoice(order.toObject());
  res.json({ success: true, data: { summary } });
});

exports.generateInvoiceEmail = asyncHandler(async (req, res) => {
  const { recipientName } = req.body;
  const order = await Order.findById(req.params.id).populate({
    path: "product",
    populate: { path: "supplier", select: "name email" },
  });
  if (!order) throw new AppError("Order not found", 404);

  const email = await generateInvoiceEmail(order.toObject(), recipientName);
  res.json({ success: true, data: { email } });
});

exports.analyseSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id).lean();
  if (!supplier) throw new AppError("Supplier not found", 404);

  const analysis = await analyseSupplier(supplier);
  res.json({ success: true, data: { analysis } });
});

exports.supplierRiskReport = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find().lean();
  if (!suppliers.length) throw new AppError("No suppliers found", 404);

  const report = await bulkSupplierRisk(suppliers);
  res.json({ success: true, data: { report } });
});
