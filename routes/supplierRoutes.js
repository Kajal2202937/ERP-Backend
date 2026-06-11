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

const { protect, authorize } = require("../middleware/authMiddleware");
const { validate, validateQuery } = require("../middleware/validate");
const { auditMiddleware } = require("../middleware/auditLog");

const {
  createSupplierSchema,
  updateSupplierSchema,
  supplierQuerySchema,
  bulkDeleteSchema,
} = require("../validation/supplierSchemas");

router.get("/", protect, validateQuery(supplierQuerySchema), getSuppliers);

router.get(
  "/analytics",
  protect,
  authorize("admin", "manager"),
  getSupplierAnalytics,
);

router.post(
  "/",
  protect,
  authorize("admin", "manager"),
  validate(createSupplierSchema),
  auditMiddleware(
    "CREATE",
    "Supplier",
    (req) => `Supplier created: ${req.body.name}`,
  ),
  createSupplier,
);

router.post(
  "/bulk-delete",
  protect,
  authorize("admin"),
  validate(bulkDeleteSchema),
  auditMiddleware(
    "DELETE",
    "Supplier",
    (req) => `Bulk delete: ${req.body.ids.length} suppliers`,
  ),
  bulkDeleteSuppliers,
);

router.put(
  "/:id",
  protect,
  authorize("admin", "manager"),
  validate(updateSupplierSchema),
  auditMiddleware(
    "UPDATE",
    "Supplier",
    (req) => `Supplier ${req.params.id} updated`,
  ),
  updateSupplier,
);

router.patch(
  "/:id/toggle-status",
  protect,
  authorize("admin", "manager"),
  auditMiddleware(
    "STATUS_CHANGE",
    "Supplier",
    (req) => `Supplier ${req.params.id} status toggled`,
  ),
  toggleSupplierStatus,
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  auditMiddleware(
    "DELETE",
    "Supplier",
    (req) => `Supplier ${req.params.id} deleted`,
  ),
  deleteSupplier,
);

module.exports = router;
