const express = require("express");
const router = express.Router();

const {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  bulkDeleteSuppliers,
  toggleSupplierStatus,
  getSupplierAnalytics,
} = require("../controllers/supplierController");

router.post("/", createSupplier);
router.get("/", getSuppliers);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);


router.post("/bulk-delete", bulkDeleteSuppliers);
router.patch("/:id/toggle-status", toggleSupplierStatus);
router.get("/analytics", getSupplierAnalytics);

module.exports = router;
