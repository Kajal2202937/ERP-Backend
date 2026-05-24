const express9 = require("express");
const router9 = express9.Router();
const {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  bulkDeleteSuppliers,
  toggleSupplierStatus,
  getSupplierAnalytics,
} = require("../controllers/supplierController");
const { protect: p9, authorize: a9 } = require("../middleware/authMiddleware");

router9.get("/analytics", p9, getSupplierAnalytics);
router9.post("/bulk-delete", p9, a9("admin"), bulkDeleteSuppliers);
router9.post("/", p9, createSupplier);
router9.get("/", p9, getSuppliers);
router9.put("/:id", p9, updateSupplier);
router9.delete("/:id", p9, a9("admin"), deleteSupplier);
router9.patch("/:id/toggle-status", p9, a9("admin"), toggleSupplierStatus);

module.exports = router9;
