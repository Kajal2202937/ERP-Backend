const express = require("express");
const router = express.Router();

const {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  bulkDeleteSuppliers,
  toggleSupplierStatus,
} = require("../controllers/supplierController");

// CRUD
router.post("/", createSupplier);
router.get("/", getSuppliers);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

// EXTRA FEATURES
router.post("/bulk-delete", bulkDeleteSuppliers);
router.patch("/:id/toggle-status", toggleSupplierStatus);

module.exports = router;