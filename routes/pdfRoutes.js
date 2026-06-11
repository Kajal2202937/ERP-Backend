const express = require("express");
const router = express.Router();

const pdf = require("../controllers/pdfController");
const xlsx = require("../controllers/xlsxController");

const { protect, authorize } = require("../middleware/authMiddleware");
const {
  upload,
  validateBufferMiddleware,
} = require("../middleware/xlsxUpload");

router.get("/invoice/:id", protect, pdf.downloadInvoice);
router.get(
  "/suppliers",
  protect,
  authorize("admin", "manager"),
  pdf.downloadSupplierReport,
);
router.get("/sales", protect, authorize("admin"), pdf.downloadSalesReport);

router.get("/xlsx/suppliers", protect, xlsx.exportSuppliersXlsx);
router.get("/xlsx/inventory", protect, xlsx.exportInventoryXlsx);
router.get("/xlsx/products", protect, xlsx.exportProductsXlsx);
router.get(
  "/xlsx/orders",
  protect,
  authorize("admin", "manager"),
  xlsx.exportOrdersXlsx,
);

router.post(
  "/xlsx/import/products",
  protect,
  authorize("admin"),
  upload.single("file"),
  validateBufferMiddleware,
  xlsx.importProductsXlsx,
);

router.post(
  "/xlsx/import/suppliers",
  protect,
  authorize("admin"),
  upload.single("file"),
  validateBufferMiddleware,
  xlsx.importSuppliersXlsx,
);

router.post(
  "/xlsx/import/inventory",
  protect,
  authorize("admin"),
  upload.single("file"),
  validateBufferMiddleware,
  xlsx.importInventoryXlsx,
);

router.post(
  "/xlsx/import/orders",
  protect,
  authorize("admin", "manager"),
  upload.single("file"),
  validateBufferMiddleware,
  xlsx.importOrdersXlsx,
);

module.exports = router;
