"use strict";

const pH = require("./index");

exports.generateSupplierReportPdf = (suppliers, res) => {
  const doc = pH.createDoc(res, "Supplier-Report");

  pH.pageHeader(
    doc,
    "SUPPLIER REPORT",
    `Generated on ${new Date().toLocaleDateString("en-IN")}`,
  );

  const active = suppliers.filter((s) => s.active).length;
  const inactive = suppliers.length - active;
  const totalVal = suppliers.reduce((a, s) => a + (s.stats?.value || 0), 0);
  const totalProfit = suppliers.reduce((a, s) => a + (s.stats?.profit || 0), 0);
  const lowRisk = suppliers.filter(
    (s) => (s.stats?.lowStock || 0) === 0,
  ).length;

  pH.kpiBox(doc, [
    {
      label: "Total Suppliers",
      value: suppliers.length,
      color: pH.BRAND.primary,
    },
    {
      label: "Active",
      value: active,
      color: pH.BRAND.success,
    },
    {
      label: "Stock Value",
      value: pH.compactCurrency(totalVal),
      color: pH.BRAND.warning,
    },
    {
      label: "Total Profit",
      value: pH.compactCurrency(totalProfit),
      color: totalProfit >= 0 ? pH.BRAND.success : pH.BRAND.danger,
    },
    {
      label: "Low-Risk Suppliers",
      value: lowRisk,
      color: pH.BRAND.success,
    },
    {
      label: "Inactive",
      value: inactive,
      color: inactive > 0 ? pH.BRAND.danger : pH.BRAND.muted,
    },
  ]);

  doc.moveDown(1.2);

  pH.hr(doc, doc.y, pH.BRAND.border);

  doc.moveDown(1.4);

  pH.sectionTitle(
    doc,
    "Supplier Details",
    `Showing ${Math.min(suppliers.length, 50)} of ${suppliers.length} suppliers`,
  );

  const headers = [
    "Supplier",
    "Company",
    "Status",
    "Stock Qty",
    "Value",
    "Profit",
  ];
  const colWidths = [110, 90, 64, 65, 85, 81];

  const rows = suppliers
    .slice(0, 50)
    .map((s) => [
      s.name,
      s.company || "N/A",
      s.active ? "Active" : "Inactive",
      (s.stats?.qty || 0).toLocaleString("en-IN"),
      `₹${(s.stats?.value || 0).toLocaleString("en-IN")}`,
      `₹${(s.stats?.profit || 0).toLocaleString("en-IN")}`,
    ]);

  pH.table(doc, headers, rows, colWidths);

  doc.moveDown(0.6);

  const activeRate =
    suppliers.length > 0
      ? ((active / suppliers.length) * 100).toFixed(1)
      : "0.0";

  pH.infoCard(
    doc,
    "Supplier Summary",
    `Out of ${suppliers.length} total suppliers, ${active} are currently active ` +
      `(${activeRate}% active rate). ` +
      `The combined inventory stock is valued at ${pH.compactCurrency(totalVal)}, ` +
      `generating a total profit of ${pH.compactCurrency(totalProfit)}. ` +
      `${lowRisk} supplier(s) carry no low-stock risk at this time.`,
    pH.BRAND.primary,
  );

  pH.pageFooter(doc);
  doc.flushPages();
  doc.end();
};
