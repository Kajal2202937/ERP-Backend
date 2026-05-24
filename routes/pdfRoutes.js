const express2 = require("express");
const router2 = express2.Router();

const pdf = require("../controllers/pdfController");
const xlsx = require("../controllers/xlsxController");

const { protect: p2, authorize: a2 } = require("../middleware/authMiddleware");

const upload = require("../middleware/xlsxUpload");

router2.get("/invoice/:id", p2, pdf.downloadInvoice);

router2.get(
  "/suppliers",
  p2,
  a2("admin", "manager"),
  pdf.downloadSupplierReport,
);

router2.get("/sales", p2, a2("admin"), pdf.downloadSalesReport);

router2.get("/xlsx/suppliers", p2, xlsx.exportSuppliersXlsx);

router2.get("/xlsx/inventory", p2, xlsx.exportInventoryXlsx);

router2.get("/xlsx/products", p2, xlsx.exportProductsXlsx);

router2.get("/xlsx/orders", p2, a2("admin", "manager"), xlsx.exportOrdersXlsx);

router2.post(
  "/xlsx/import/products",
  p2,
  a2("admin"),
  upload.single("file"),
  xlsx.importProductsXlsx,
);

router2.post(
  "/xlsx/import/suppliers",
  p2,
  a2("admin"),
  upload.single("file"),
  xlsx.importSuppliersXlsx,
);

router2.post(
  "/xlsx/import/inventory",
  p2,
  a2("admin"),
  upload.single("file"),
  xlsx.importInventoryXlsx,
);

router2.post(
  "/xlsx/import/orders",
  p2,
  a2("admin", "manager"),
  upload.single("file"),
  xlsx.importOrdersXlsx,
);

module.exports = router2;
