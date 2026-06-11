"use strict";

const PDFDocument = require("pdfkit");
const {
  hr,
  pageHeader,
  pageFooter,
  sectionTitle,
  table,
  infoCard,
  drawBadge,
  BRAND,
  MARGIN,
  PAGE_W,
  CONTENT_W,
} = require("./index");

const fmt = (num) => `Rs. ${Number(num).toLocaleString("en-IN")}`;

const generateInvoicePdfBuffer = (order) => {
  return new Promise((resolve, reject) => {
    const invoiceNo = order._id.toString().slice(-8).toUpperCase();

    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `Invoice-${invoiceNo}`,
        Author: "ERP System",
        Subject: "Tax Invoice",
      },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    pageHeader(doc, "TAX INVOICE", `Invoice #${invoiceNo}`);
    sectionTitle(doc, "Billing Information");

    const infoY = doc.y;
    const colMid = MARGIN + CONTENT_W * 0.52;

    doc
      .fillColor(BRAND.muted)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text("BILLED TO", MARGIN, infoY, { characterSpacing: 0.6 });
    doc
      .fillColor(BRAND.dark)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(order.product?.supplier?.name || "N/A", MARGIN, infoY + 14);
    doc
      .fillColor(BRAND.text)
      .font("Helvetica")
      .fontSize(9)
      .text(order.product?.supplier?.email || "-", MARGIN, infoY + 32)
      .text(order.product?.supplier?.phone || "-", MARGIN, infoY + 46);

    if (order.customer?.name || order.customer?.email) {
      doc
        .fillColor(BRAND.muted)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text("CUSTOMER", MARGIN, infoY + 66, { characterSpacing: 0.6 });
      doc
        .fillColor(BRAND.dark)
        .font("Helvetica")
        .fontSize(9)
        .text(order.customer?.name || "-", MARGIN, infoY + 80)
        .text(order.customer?.email || "-", MARGIN, infoY + 94)
        .text(order.customer?.phone || "-", MARGIN, infoY + 108);
    }

    const metaData = [
      ["Invoice Date", new Date(order.createdAt).toLocaleDateString("en-IN")],
      ["Invoice No.", `#${invoiceNo}`],
      ["Order No.", order.orderNumber || invoiceNo],
      ["Status", order.status],
      [
        "Due Date",
        new Date(Date.now() + 15 * 864e5).toLocaleDateString("en-IN"),
      ],
    ];
    const metaBoxH = metaData.length * 17 + 12;
    doc
      .roundedRect(
        colMid - 10,
        infoY - 6,
        CONTENT_W - (colMid - MARGIN) + 10,
        metaBoxH,
        8,
      )
      .fill(BRAND.light);
    doc
      .strokeColor(BRAND.border)
      .lineWidth(0.7)
      .roundedRect(
        colMid - 10,
        infoY - 6,
        CONTENT_W - (colMid - MARGIN) + 10,
        metaBoxH,
        8,
      )
      .stroke();
    let metaY = infoY + 2;
    metaData.forEach(([label, value]) => {
      doc
        .fillColor(BRAND.muted)
        .font("Helvetica")
        .fontSize(8)
        .text(label, colMid, metaY, { width: 90 });
      if (label === "Status") {
        drawBadge(doc, value, colMid + 100, 80, metaY - 2, 18);
      } else {
        doc
          .fillColor(BRAND.dark)
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(value, colMid + 100, metaY, { width: 90, align: "left" });
      }
      metaY += 17;
    });

    doc.y = infoY + metaBoxH + 10;
    hr(doc, doc.y, BRAND.border);
    doc.moveDown(1.4);
    sectionTitle(doc, "Invoice Items");

    const unitCost = order.costPrice;
    const totalCost = order.costPrice * order.quantity;

    table(
      doc,
      ["Product", "Qty", "Unit Price", "Unit Cost", "Total"],
      [
        [
          order.product?.name || "Product",
          order.quantity,
          fmt(order.price),
          fmt(unitCost),
          fmt(order.totalPrice),
        ],
      ],
      [150, 55, 70, 70, 100],
    );
    doc.moveDown(0.8);

    const revenue = order.totalPrice;
    const profit = revenue - totalCost;
    const profitPct =
      revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";
    const isLoss = profit < 0;

    const TOTALS_X = 318;
    const TOTALS_W = PAGE_W - MARGIN - TOTALS_X;

    const totals = [
      { label: "Revenue (Total)", value: fmt(revenue), highlight: false },
      { label: "Total Cost", value: fmt(totalCost), highlight: false },
      {
        label: isLoss ? "Net Loss" : "Gross Profit",
        value: `${isLoss ? "-" : "+"}${fmt(Math.abs(profit))}`,
        highlight: false,
        isLoss,
      },
      { label: "Margin", value: `${profitPct}%`, highlight: true, isLoss },
    ];

    let ty = doc.y;
    totals.forEach(({ label, value, highlight, isLoss: loss }) => {
      if (highlight) {
        doc
          .roundedRect(TOTALS_X - 10, ty - 2, TOTALS_W + 10, 28, 8)
          .fill(loss ? BRAND.danger : BRAND.primary);
        doc
          .fillColor(BRAND.white)
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .text(label, TOTALS_X, ty + 5, { width: TOTALS_W * 0.48 });
        doc
          .fillColor(BRAND.white)
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .text(value, TOTALS_X, ty + 5, {
            width: TOTALS_W - 4,
            align: "right",
          });
      } else {
        doc
          .fillColor(BRAND.muted)
          .font("Helvetica")
          .fontSize(8.5)
          .text(label, TOTALS_X, ty + 5, { width: TOTALS_W * 0.48 });
        const vc =
          label.includes("Profit") || label.includes("Loss")
            ? loss
              ? BRAND.danger
              : BRAND.success
            : BRAND.dark;
        doc
          .fillColor(vc)
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(value, TOTALS_X, ty + 5, {
            width: TOTALS_W - 4,
            align: "right",
          });
        doc
          .strokeColor(BRAND.border)
          .lineWidth(0.5)
          .moveTo(TOTALS_X - 10, ty + 25)
          .lineTo(TOTALS_X + TOTALS_W, ty + 25)
          .stroke();
      }
      ty += 28;
    });

    doc.y = ty + 18;
    infoCard(
      doc,
      "Payment Terms",
      `Payment is due within 15 days of the invoice date. Please include invoice #${invoiceNo} as a reference in your payment. For queries, contact your account manager.`,
      BRAND.accent,
    );
    doc
      .fillColor(BRAND.subtle)
      .font("Helvetica")
      .fontSize(8)
      .text("Thank you for your business.", MARGIN, doc.y + 8, {
        align: "center",
        width: CONTENT_W,
      });
    pageFooter(doc);
    doc.end();
  });
};

module.exports = { generateInvoicePdfBuffer };
