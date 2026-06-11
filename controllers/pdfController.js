const asyncPdf = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const { generateInvoicePdf } = require("../services/pdf/invoicePdf");
const { generateSupplierReportPdf } = require("../services/pdf/supplierPdf");
const { generateSalesReportPdf } = require("../services/pdf/reportPdf");

const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const {
  getSalesSummaryService: sumSvc,
  getSalesTrendService: trendSvc,
  getTopProductsService: topSvc,
} = require("../services/reportService");

const sendPdf = (res, buffer, filename) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).end(buffer);
};

exports.downloadInvoice = asyncPdf(async (req, res) => {
  const order = await Order.findById(req.params.id).populate({
    path: "product",
    populate: { path: "supplier", select: "name email phone" },
  });
  if (!order) throw new AppError("Order not found", 404);

  const buffer = await generateInvoicePdf(order.toObject());
  sendPdf(res, buffer, `invoice-${order.orderNumber || req.params.id}.pdf`);
});

exports.downloadSupplierReport = asyncPdf(async (req, res) => {
  const suppliers = await Supplier.find().lean();
  if (!suppliers.length) throw new AppError("No suppliers found", 404);

  const buffer = await generateSupplierReportPdf(suppliers);
  sendPdf(res, buffer, `supplier-report-${Date.now()}.pdf`);
});

exports.downloadSalesReport = asyncPdf(async (req, res) => {
  const { startDate, endDate } = req.query;

  const [summary, topProducts, trend] = await Promise.all([
    sumSvc(startDate, endDate),
    topSvc(),
    trendSvc(startDate, endDate),
  ]);

  const buffer = await generateSalesReportPdf({ summary, topProducts, trend });
  sendPdf(res, buffer, `sales-report-${Date.now()}.pdf`);
});
