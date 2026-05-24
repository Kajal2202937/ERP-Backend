"use strict";

const {
  createDoc,
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

exports.generateInvoicePdf = (order, res) => {
  const invoiceNo = order._id.toString().slice(-8).toUpperCase();
  const doc = createDoc(res, `Invoice-${invoiceNo}`);

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
    .text(order.product?.supplier?.email || "—", MARGIN, infoY + 32)
    .text(order.product?.supplier?.phone || "—", MARGIN, infoY + 46);

  const metaData = [
    ["Invoice Date", new Date(order.createdAt).toLocaleDateString("en-IN")],
    ["Invoice No.", `#${invoiceNo}`],
    ["Status", order.status],
    ["Due Date", new Date(Date.now() + 15 * 864e5).toLocaleDateString("en-IN")],
  ];

  doc
    .roundedRect(
      colMid - 10,
      infoY - 6,
      CONTENT_W - (colMid - MARGIN) + 10,
      76,
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
      76,
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

  doc.y = infoY + 86;

  hr(doc, doc.y, BRAND.border);
  doc.moveDown(1.4);

  sectionTitle(doc, "Invoice Items");

  table(
    doc,
    ["Product", "Qty", "Unit Price", "Cost Price", "Total"],
    [
      [
        order.product?.name || "Product",
        order.quantity,
        `₹${order.price.toLocaleString("en-IN")}`,
        `₹${order.costPrice.toLocaleString("en-IN")}`,
        `₹${order.totalPrice.toLocaleString("en-IN")}`,
      ],
    ],
    [195, 55, 85, 85, 75],
  );

  doc.moveDown(0.8);

  const profit = order.totalPrice - order.costPrice * order.quantity;
  const profitPct =
    order.totalPrice > 0
      ? ((profit / order.totalPrice) * 100).toFixed(1)
      : "0.0";

  const TOTALS_X = 318;
  const TOTALS_W = PAGE_W - MARGIN - TOTALS_X;

  const totals = [
    {
      label: "Subtotal",
      value: `₹${order.totalPrice.toLocaleString("en-IN")}`,
      highlight: false,
    },
    {
      label: "Total Cost",
      value: `₹${(order.costPrice * order.quantity).toLocaleString("en-IN")}`,
      highlight: false,
    },
    {
      label: "Gross Profit",
      value: `₹${profit.toLocaleString("en-IN")}`,
      highlight: false,
    },
    { label: "Margin", value: `${profitPct}%`, highlight: true },
  ];

  let ty = doc.y;

  totals.forEach(({ label, value, highlight }) => {
    if (highlight) {
      doc
        .roundedRect(TOTALS_X - 10, ty - 2, TOTALS_W + 10, 28, 8)
        .fill(BRAND.primary);

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

      doc
        .fillColor(BRAND.dark)
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
    `Payment is due within 15 days of the invoice date. ` +
      `Please include invoice #${invoiceNo} as a reference in your payment. ` +
      `For queries, contact your account manager.`,
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
};
