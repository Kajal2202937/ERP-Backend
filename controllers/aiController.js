const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");
const { AI_LIMITS } = require("../services/ai/openaiService");

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

const CHAT_LIMITS = {
  MAX_HISTORY: AI_LIMITS.MAX_MESSAGES,
  MAX_MSG_CHARS: AI_LIMITS.MAX_MSG_CHARS,
  MAX_CONTEXT_KEYS: 4,
  MAX_NOTE_CHARS: 200,
};

exports.assistantChat = asyncHandler(async (req, res) => {
  const { history, context } = req.body;

  if (!Array.isArray(history)) {
    throw new AppError("history must be an array of message objects", 400);
  }
  if (history.length === 0) {
    throw new AppError("history cannot be empty", 400);
  }

  if (history.length > CHAT_LIMITS.MAX_HISTORY) {
    console.warn(
      `[AI] Chat history truncated: ${history.length} → ${CHAT_LIMITS.MAX_HISTORY} messages | user: ${req.user._id}`,
    );
  }

  const VALID_ROLES = new Set(["user", "assistant"]);
  for (const msg of history) {
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      throw new AppError(
        "Each history item must be an object with role and content",
        400,
      );
    }

    if (!VALID_ROLES.has(msg.role)) {
      throw new AppError(
        `Invalid message role "${msg.role}". Must be "user" or "assistant"`,
        400,
      );
    }

    if (typeof msg.content !== "string" || msg.content.trim().length === 0) {
      throw new AppError(
        "Each message must have non-empty string content",
        400,
      );
    }

    if (msg.content.length > CHAT_LIMITS.MAX_MSG_CHARS * 2) {
      console.warn(
        `[AI] Oversized message (${msg.content.length} chars) from user: ${req.user._id}`,
      );
    }
  }

  const rawCtx = context && typeof context === "object" ? context : {};
  const safeContext = {
    totalOrders: Number(rawCtx.totalOrders) || 0,
    totalRevenue: Number(rawCtx.totalRevenue) || 0,
    activeSuppliers: Number(rawCtx.activeSuppliers) || 0,
    lowStock: Number(rawCtx.lowStock) || 0,
  };

  const reply = await erpAssistantChat(history, safeContext);

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

  const safeRecipientName =
    typeof recipientName === "string"
      ? recipientName.trim().slice(0, CHAT_LIMITS.MAX_NOTE_CHARS)
      : "Customer";

  const order = await Order.findById(req.params.id).populate({
    path: "product",
    populate: { path: "supplier", select: "name email" },
  });
  if (!order) throw new AppError("Order not found", 404);

  const email = await generateInvoiceEmail(order.toObject(), safeRecipientName);
  res.json({ success: true, data: { email } });
});

exports.analyseSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id).lean();
  if (!supplier) throw new AppError("Supplier not found", 404);

  const analysis = await analyseSupplier(supplier);
  res.json({ success: true, data: { analysis } });
});

exports.supplierRiskReport = asyncHandler(async (req, res) => {
  const MAX_SUPPLIERS_FOR_AI = 20;

  const suppliers = await Supplier.find().limit(MAX_SUPPLIERS_FOR_AI).lean();

  if (!suppliers.length) throw new AppError("No suppliers found", 404);

  const report = await bulkSupplierRisk(suppliers);
  res.json({ success: true, data: { report } });
});
