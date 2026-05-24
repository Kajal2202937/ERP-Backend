"use strict";

const PDFDocument = require("pdfkit");

const BRAND = {
  primary: "#4f46e5",
  primaryLight: "#818cf8",
  primaryXLight: "#e0e7ff",
  primaryDark: "#3730a3",

  secondary: "#7c3aed",
  accent: "#0ea5e9",

  dark: "#0f172a",
  darkAlt: "#1e293b",
  text: "#334155",
  muted: "#64748b",
  subtle: "#94a3b8",

  white: "#ffffff",
  light: "#f8fafc",
  lighter: "#f1f5f9",

  border: "#e2e8f0",
  borderStrong: "#cbd5e1",

  success: "#059669",
  successBg: "#d1fae5",
  successText: "#065f46",

  danger: "#dc2626",
  dangerBg: "#fee2e2",
  dangerText: "#991b1b",

  warning: "#d97706",
  warningBg: "#fef3c7",
  warningText: "#92400e",

  info: "#0284c7",
  infoBg: "#dbeafe",
  infoText: "#1e40af",
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const formatCurrency = (num = 0) =>
  `Rs. ${Number(num).toLocaleString("en-IN")}`;

const compactCurrency = (num = 0) => {
  num = Number(num);
  if (num >= 10_000_000) return `Rs. ${(num / 10_000_000).toFixed(2)} Cr`;
  if (num >= 100_000) return `Rs. ${(num / 100_000).toFixed(2)} L`;
  if (num >= 1_000) return `Rs. ${(num / 1_000).toFixed(1)} K`;
  return `Rs. ${num}`;
};

const createDoc = (res, filename) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: filename,
      Author: "ERP System",
      Subject: "ERP Analytics Report",
      Keywords: "ERP, Report, Invoice, Analytics",
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.pdf"`,
  );
  doc.pipe(res);
  return doc;
};

const pageBackground = (doc) => {
  doc.save();
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(BRAND.white);
  doc.restore();
};

const hr = (doc, y, color = BRAND.border, lineWidth = 1) => {
  doc
    .strokeColor(color)
    .lineWidth(lineWidth)
    .moveTo(MARGIN, y)
    .lineTo(PAGE_W - MARGIN, y)
    .stroke();
};

const HEADER_H = 108;

const pageHeader = (doc, title, subtitle = "") => {
  pageBackground(doc);

  doc.rect(0, 0, PAGE_W, HEADER_H).fill(BRAND.dark);

  doc.rect(PAGE_W - 200, 0, 200, HEADER_H).fill(BRAND.darkAlt);

  doc.rect(0, 0, PAGE_W, 5).fill(BRAND.primary);

  doc
    .strokeColor("#2d3f55")
    .lineWidth(1)
    .moveTo(PAGE_W - 205, 20)
    .lineTo(PAGE_W - 205, HEADER_H - 16)
    .stroke();

  doc.circle(MARGIN + 27, 59, 24).fill(BRAND.primaryDark);
  doc.circle(MARGIN + 25, 57, 24).fill(BRAND.primary);

  doc
    .fillColor(BRAND.white)
    .font("Helvetica-Bold")
    .fontSize(21)
    .text("E", MARGIN + 17, 47);

  doc
    .fillColor(BRAND.white)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("ERP SYSTEM", MARGIN + 62, 40);

  doc
    .fillColor(BRAND.subtle)
    .font("Helvetica")
    .fontSize(7.5)
    .text("Business Intelligence & Analytics Platform", MARGIN + 62, 62);

  const dotY = 78;
  [0, 9, 18].forEach((offset) => {
    doc.circle(MARGIN + 63 + offset, dotY, 1.5).fill(BRAND.primary);
  });

  doc
    .fillColor(BRAND.primaryLight)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(title, 0, 38, { align: "right", width: PAGE_W - MARGIN - 14 });

  if (subtitle) {
    doc
      .fillColor(BRAND.subtle)
      .font("Helvetica")
      .fontSize(8)
      .text(subtitle, 0, 59, { align: "right", width: PAGE_W - MARGIN - 14 });
  }

  doc.rect(0, HEADER_H, PAGE_W, 4).fill(BRAND.primaryDark);

  doc.y = HEADER_H + 26;
};

const pageFooter = (doc) => {
  const range = doc.bufferedPageRange();

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);

    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const footerTop = PAGE_H - 30;

    doc.rect(0, footerTop - 8, PAGE_W, 38).fill(BRAND.light);

    doc
      .strokeColor(BRAND.border)
      .lineWidth(1)
      .moveTo(MARGIN, footerTop - 8)
      .lineTo(PAGE_W - MARGIN, footerTop - 8)
      .stroke();

    doc
      .fillColor(BRAND.primary)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text("ERP SYSTEM", MARGIN, footerTop + 1);

    doc
      .fillColor(BRAND.muted)
      .font("Helvetica")
      .fontSize(7.5)
      .text("  •  Confidential Business Report", MARGIN + 56, footerTop + 1);

    doc
      .fillColor(BRAND.text)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(`Page ${i + 1} / ${range.count}`, 0, footerTop + 1, {
        align: "right",
        width: PAGE_W - MARGIN,
      });

    doc.page.margins.bottom = savedBottom;
  }
};

const sectionTitle = (doc, title, description = "") => {
  if (doc.y > PAGE_H - 160) {
    doc.addPage();
    pageHeader(doc, "CONTINUED");
  }

  const titleY = doc.y;

  doc.circle(MARGIN + 3, titleY + 7, 3).fill(BRAND.primary);

  doc
    .fillColor(BRAND.dark)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(title, MARGIN + 13, titleY);

  doc.moveDown(0.3);

  const accentEnd = MARGIN + 13 + Math.min(title.length * 6.2, 160);

  doc
    .strokeColor(BRAND.primary)
    .lineWidth(2.5)
    .moveTo(MARGIN, doc.y)
    .lineTo(accentEnd, doc.y)
    .stroke();

  doc
    .strokeColor(BRAND.border)
    .lineWidth(0.8)
    .moveTo(accentEnd + 5, doc.y)
    .lineTo(PAGE_W - MARGIN, doc.y)
    .stroke();

  if (description) {
    doc.moveDown(0.5);
    doc
      .fillColor(BRAND.muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text(description, MARGIN, doc.y, { width: CONTENT_W });
  }

  doc.moveDown(1);
};

const BADGE_STATUS = {
  active: { bg: BRAND.successBg, fg: BRAND.successText },
  completed: { bg: BRAND.successBg, fg: BRAND.successText },
  paid: { bg: BRAND.successBg, fg: BRAND.successText },
  shipped: { bg: BRAND.successBg, fg: BRAND.successText },
  inactive: { bg: BRAND.dangerBg, fg: BRAND.dangerText },
  cancelled: { bg: BRAND.dangerBg, fg: BRAND.dangerText },
  failed: { bg: BRAND.dangerBg, fg: BRAND.dangerText },
  returned: { bg: BRAND.dangerBg, fg: BRAND.dangerText },
  pending: { bg: BRAND.warningBg, fg: BRAND.warningText },
  processing: { bg: BRAND.warningBg, fg: BRAND.warningText },
};

const BADGE_WORDS = new Set(Object.keys(BADGE_STATUS));

/**
 * Draws a pill-shaped status badge.
 * @param {PDFDocument} doc
 * @param {string} text      Raw text (e.g. "Active")
 * @param {number} cx        Left edge of the cell
 * @param {number} cellW     Width of the cell (for centering)
 * @param {number} rowY      Top of the table row
 * @param {number} rowH      Height of the table row
 */
const drawBadge = (doc, text, cx, cellW, rowY, rowH) => {
  const key = text.toLowerCase();
  const palette = BADGE_STATUS[key] || { bg: BRAND.infoBg, fg: BRAND.infoText };
  const BADGE_W = 58;
  const BADGE_H = 17;
  const bx = cx + (cellW - BADGE_W) / 2;
  const by = rowY + (rowH - BADGE_H) / 2;

  doc.roundedRect(bx, by, BADGE_W, BADGE_H, BADGE_H / 2).fill(palette.bg);

  doc
    .fillColor(palette.fg)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text(text.toUpperCase(), bx, by + 5, {
      width: BADGE_W,
      align: "center",
      characterSpacing: 0.4,
    });
};

const kpiBox = (doc, items, startY) => {
  const CARD_W = 234;
  const CARD_H = 78;
  const GAP = 14;
  const ACCENT_W = 5;
  const y0 = startY != null ? startY : doc.y;

  items.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = MARGIN + col * (CARD_W + GAP);
    const y = y0 + row * (CARD_H + GAP);
    const accent = item.color || BRAND.primary;

    doc.roundedRect(x + 3, y + 4, CARD_W, CARD_H, 10).fill("#eef1f7");

    doc.roundedRect(x, y, CARD_W, CARD_H, 10).fill(BRAND.white);

    doc
      .strokeColor(BRAND.border)
      .lineWidth(0.8)
      .roundedRect(x, y, CARD_W, CARD_H, 10)
      .stroke();

    doc.save();
    doc.roundedRect(x, y, CARD_W, CARD_H, 10).clip();
    doc.rect(x, y, ACCENT_W, CARD_H).fill(accent);
    doc.restore();

    const labelX = x + ACCENT_W + 14;
    doc
      .fillColor(BRAND.muted)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(item.label.toUpperCase(), labelX, y + 13, {
        width: CARD_W - ACCENT_W - 24,
        characterSpacing: 0.5,
        lineBreak: false,
      });

    doc
      .strokeColor(BRAND.border)
      .lineWidth(0.6)
      .moveTo(labelX, y + 29)
      .lineTo(x + CARD_W - 14, y + 29)
      .stroke();

    doc
      .fillColor(BRAND.dark)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(String(item.value), labelX, y + 38, {
        width: CARD_W - ACCENT_W - 24,
        ellipsis: true,
        lineBreak: false,
      });
  });

  const totalRows = Math.ceil(items.length / 2);
  doc.y = y0 + totalRows * (CARD_H + GAP) + 6;
};

const table = (doc, headers, rows, colWidths, startY) => {
  const ROW_H = 32;
  const X0 = MARGIN;

  const MIN_SPACE = ROW_H + 5 + 2 * (ROW_H + 4) + 60;

  let y = startY != null ? startY : doc.y;

  if (y + MIN_SPACE > PAGE_H - 50) {
    doc.addPage();
    pageHeader(doc, "CONTINUED");
    y = doc.y;
  }

  doc.roundedRect(X0, y, CONTENT_W, ROW_H, 8).fill(BRAND.darkAlt);

  doc.save();
  doc.roundedRect(X0, y, CONTENT_W, ROW_H, 8).clip();
  doc.rect(X0, y, CONTENT_W, 3).fill(BRAND.primary);
  doc.restore();

  let cx = X0 + 14;

  headers.forEach((headerText, i) => {
    const isLast = i === headers.length - 1;
    doc
      .fillColor("#e2e8f0")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(headerText.toUpperCase(), cx, y + 12, {
        width: colWidths[i] - 16,
        align: isLast ? "right" : "left",
        characterSpacing: 0.4,
        lineBreak: false,
      });
    cx += colWidths[i];
  });

  y += ROW_H + 5;

  rows.forEach((row, ri) => {
    if (y > PAGE_H - 90) {
      doc.addPage();
      pageHeader(doc, "CONTINUED");
      y = doc.y;
    }

    const rowBg = ri % 2 === 0 ? BRAND.white : BRAND.light;

    doc.roundedRect(X0, y, CONTENT_W, ROW_H, 6).fill(rowBg);
    doc
      .strokeColor(BRAND.border)
      .lineWidth(0.6)
      .roundedRect(X0, y, CONTENT_W, ROW_H, 6)
      .stroke();

    cx = X0 + 14;

    row.forEach((cell, ci) => {
      const value = String(cell ?? "—");
      const lower = value.toLowerCase();
      const isCurrency = value.includes("Rs.") || value.includes("₹");
      const isPercent = value.includes("%");
      const isLast = ci === row.length - 1;
      let align = "left";

      if (isCurrency || isPercent) align = "right";
      if (isLast && isCurrency) align = "right";

      if (BADGE_WORDS.has(lower)) {
        drawBadge(doc, value, cx, colWidths[ci], y, ROW_H);
      } else {
        let fgColor = ci === 0 ? BRAND.dark : BRAND.text;
        if (isCurrency) {
          const num = parseFloat(value.replace(/[^0-9.\-]/g, ""));
          if (!isNaN(num) && num < 0) fgColor = BRAND.danger;
        }

        doc
          .fillColor(fgColor)
          .font(ci === 0 ? "Helvetica-Bold" : "Helvetica")
          .fontSize(8.5)
          .text(value, cx, y + 11, {
            width: colWidths[ci] - 18,
            align,
            ellipsis: true,
            lineBreak: false,
          });
      }

      cx += colWidths[ci];
    });

    y += ROW_H + 4;
  });

  doc.y = y + 8;
};

const infoCard = (doc, title, body, accentColor = BRAND.primary) => {
  const textH = doc.heightOfString(body, { width: CONTENT_W - 44, lineGap: 4 });
  const cardH = textH + 58;

  if (doc.y + cardH > PAGE_H - 80) {
    doc.addPage();
    pageHeader(doc, "CONTINUED");
  }

  const cardY = doc.y + 10;

  doc.roundedRect(MARGIN, cardY, CONTENT_W, cardH, 10).fill(BRAND.light);

  doc
    .strokeColor(BRAND.border)
    .lineWidth(1)
    .roundedRect(MARGIN, cardY, CONTENT_W, cardH, 10)
    .stroke();

  doc.save();
  doc.roundedRect(MARGIN, cardY, CONTENT_W, cardH, 10).clip();
  doc.rect(MARGIN, cardY, 4, cardH).fill(accentColor);
  doc.restore();

  doc
    .fillColor(accentColor)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(title, MARGIN + 18, cardY + 14);

  doc
    .strokeColor(BRAND.border)
    .lineWidth(0.8)
    .moveTo(MARGIN + 18, cardY + 32)
    .lineTo(MARGIN + CONTENT_W - 18, cardY + 32)
    .stroke();

  doc
    .fillColor(BRAND.text)
    .font("Helvetica")
    .fontSize(9)
    .text(body, MARGIN + 18, cardY + 40, {
      width: CONTENT_W - 40,
      lineGap: 4,
    });

  doc.y = cardY + cardH + 14;
};

module.exports = {
  createDoc,
  pageHeader,
  pageFooter,

  sectionTitle,
  hr,
  kpiBox,
  table,
  infoCard,
  drawBadge,

  formatCurrency,
  compactCurrency,

  BRAND,
  CONTENT_W,
  MARGIN,
  PAGE_W,
  PAGE_H,
  HEADER_H,
};
