const PDFDocument = require("pdfkit");
const Production = require("../models/Production");

exports.generateProductionReport = async (startDate, endDate, res) => {
  const filter = {};

  if (startDate && endDate) {
    filter.productionDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const data = await Production.find(filter).populate("product", "name");

  // ---------------- KPIs ----------------
  const total = data.length;

  const completed = data.filter((p) => p.status === "completed").length;
  const inProgress = data.filter((p) => p.status === "in-progress").length;
  const started = data.filter((p) => p.status === "started").length;

  const totalQty = data.reduce(
    (sum, p) => sum + p.quantityProduced,
    0
  );

  // ---------------- PDF ----------------
  const doc = new PDFDocument();

  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=production-report.pdf"
  );

  doc.pipe(res);

  // TITLE
  doc.fontSize(18).text("Production Report", { align: "center" });
  doc.moveDown();

  // DATE RANGE
  doc.fontSize(12).text(
    `Date Range: ${startDate || "All"} - ${endDate || "All"}`
  );

  doc.moveDown();

  // KPIs
  doc.fontSize(14).text("Summary");
  doc.fontSize(12).text(`Total Productions: ${total}`);
  doc.text(`Completed: ${completed}`);
  doc.text(`In Progress: ${inProgress}`);
  doc.text(`Started: ${started}`);
  doc.text(`Total Quantity Produced: ${totalQty}`);

  doc.moveDown();

  // TABLE HEADER
  doc.fontSize(14).text("Details:");
  doc.moveDown();

  data.forEach((p, index) => {
    doc
      .fontSize(10)
      .text(
        `${index + 1}. ${p.product?.name} | Qty: ${p.quantityProduced} | Status: ${p.status} | Date: ${p.productionDate.toDateString()}`
      );
  });

  doc.end();
};