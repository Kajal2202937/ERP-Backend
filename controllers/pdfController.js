const asyncPdf = require("../middleware/asyncHandler");
const AppErrorPdf = require("../utils/AppError");

const { generateInvoicePdf } = require("../services/pdf/invoicePdf");
const { generateSupplierReportPdf } = require("../services/pdf/supplierPdf");
const { generateSalesReportPdf } = require("../services/pdf/reportPdf");

const OrderPdf = require("../models/Order");
const SupplierPdf = require("../models/Supplier");
const {
  getSalesSummaryService: sumSvc,
  getSalesTrendService: trendSvc,
  getTopProductsService: topSvc,
} = require("../services/reportService");

exports.downloadInvoice = asyncPdf(async (req, res) => {
  const order = await OrderPdf.findById(req.params.id).populate({
    path: "product",
    populate: { path: "supplier", select: "name email phone" },
  });

  if (!order) throw new AppErrorPdf("Order not found", 404);

  generateInvoicePdf(order.toObject(), res);
});

exports.downloadSupplierReport = asyncPdf(async (req, res) => {
  const suppliers = await SupplierPdf.find().lean();
  if (!suppliers.length) throw new AppErrorPdf("No suppliers found", 404);

  generateSupplierReportPdf(suppliers, res);
});

exports.downloadSalesReport = asyncPdf(async (req, res) => {
  const { startDate, endDate } = req.query;

  const [summary, topProducts, trend] = await Promise.all([
    sumSvc(startDate, endDate),
    topSvc(),
    trendSvc(startDate, endDate),
  ]);

  generateSalesReportPdf({ summary, topProducts, trend }, res);
});
