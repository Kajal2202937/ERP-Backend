"use strict";

const PDFDocument = require("pdfkit");
const rH = require("./index");

/**
 * Generates a sales report PDF and returns a Buffer.
 * The old signature accepted (data, res) and streamed directly — that
 * caused "Cannot read properties of undefined (reading 'setHeader')"
 * because the controller now calls generateSalesReportPdf(data) with no res.
 * Fixed: build into an in-memory buffer (same pattern as invoicePdfBuffer.js)
 * and resolve the Promise so the controller can call sendPdf(res, buffer, …).
 */
exports.generateSalesReportPdf = (data) => {
  return new Promise((resolve, reject) => {
    const { summary = {}, topProducts = [], trend = [] } = data;

    const doc = new PDFDocument({
      size: "A4",
      margin: rH.MARGIN,
      bufferPages: true,
      info: {
        Title: "Sales-Report",
        Author: "ERP System",
        Subject: "ERP Analytics Report",
        Keywords: "ERP, Report, Sales, Analytics",
      },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    rH.pageHeader(
      doc,
      "SALES REPORT",
      `Generated on ${new Date().toLocaleDateString("en-IN")}`,
    );

    const isPositiveMargin = (summary.profitMargin || 0) >= 0;
    const isPositiveProfit = (summary.profit || 0) >= 0;

    rH.kpiBox(doc, [
      {
        label: "Total Orders",
        value: (summary.totalOrders || 0).toLocaleString("en-IN"),
        color: rH.BRAND.primary,
      },
      {
        label: "Total Revenue",
        value: rH.compactCurrency(summary.totalRevenue || 0),
        color: rH.BRAND.warning,
      },
      {
        label: "Gross Profit",
        value: rH.compactCurrency(summary.profit || 0),
        color: isPositiveProfit ? rH.BRAND.success : rH.BRAND.danger,
      },
      {
        label: "Profit Margin",
        value: `${(summary.profitMargin || 0).toFixed(2)}%`,
        color: isPositiveMargin ? rH.BRAND.success : rH.BRAND.danger,
      },
      {
        label: "Qty Sold",
        value: (summary.totalQuantity || 0).toLocaleString("en-IN"),
        color: rH.BRAND.secondary,
      },
      {
        label: "Avg. Order Value",
        value: summary.totalOrders
          ? rH.formatCurrency(
              Math.round((summary.totalRevenue || 0) / summary.totalOrders),
            )
          : "Rs. 0",
        color: rH.BRAND.accent,
      },
    ]);

    doc.moveDown(1.5);

    if (topProducts.length) {
      rH.sectionTitle(
        doc,
        "Top Performing Products",
        "Ranked by total units sold",
      );

      const productRows = topProducts
        .slice(0, 10)
        .map((product, index) => [
          `${index + 1}. ${product.name || "N/A"}`,
          product.category || "General",
          (product.totalSold || 0).toLocaleString("en-IN"),
        ]);

      rH.table(
        doc,
        ["Product Name", "Category", "Units Sold"],
        productRows,
        [245, 160, 45],
      );

      doc.moveDown(1.5);
    }

    if (trend.length) {
      rH.sectionTitle(doc, "Sales Trend Analysis", "Last 30 days of activity");

      const trendRows = trend
        .slice(-30)
        .map((item) => [
          new Date(item.date).toLocaleDateString("en-IN"),
          rH.formatCurrency(item.total || 0),
        ]);

      rH.table(doc, ["Date", "Revenue Generated"], trendRows, [220, 275]);

      doc.moveDown(1.5);
    }

    const profitPhrase = isPositiveMargin
      ? `a positive profit margin of ${(summary.profitMargin || 0).toFixed(2)}%`
      : `a negative profit margin of ${(summary.profitMargin || 0).toFixed(2)}%`;

    const insight =
      `Total revenue generated was ${rH.formatCurrency(summary.totalRevenue || 0)}. ` +
      `The business processed ${(summary.totalOrders || 0).toLocaleString("en-IN")} orders ` +
      `with ${profitPhrase}. ` +
      (summary.totalQuantity
        ? `A total of ${(summary.totalQuantity || 0).toLocaleString("en-IN")} units were sold ` +
          `at an average order value of ${
            summary.totalOrders
              ? rH.formatCurrency(
                  Math.round((summary.totalRevenue || 0) / summary.totalOrders),
                )
              : "Rs. 0"
          }.`
        : "");

    rH.infoCard(
      doc,
      "Business Insights",
      insight,
      isPositiveMargin ? rH.BRAND.success : rH.BRAND.danger,
    );

    rH.pageFooter(doc);
    doc.flushPages();
    doc.end();
  });
};
