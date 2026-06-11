const express = require("express");
const router  = express.Router();

const {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, deleteOrder, resendInvoice,
} = require("../controllers/orderController");

const { protect, authorize }  = require("../middleware/authMiddleware");
const { validate, validateParams } = require("../middleware/validate");
const { auditMiddleware }     = require("../middleware/auditLog");

const {
  createOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
} = require("../validation/orderSchemas");

router.get("/",    protect, getOrders);
router.get("/:id", protect, validateParams(orderIdParamSchema), getOrderById);

router.post("/",
  protect,
  validate(createOrderSchema),
  auditMiddleware("CREATE", "Order", (req) => `Order created for product ${req.body.product}`),
  createOrder,
);

router.post("/:id/resend-invoice",
  protect,
  authorize("admin", "manager"),
  validateParams(orderIdParamSchema),
  resendInvoice,
);

router.patch("/:id/status",
  protect,
  authorize("admin", "manager"),
  validateParams(orderIdParamSchema),
  validate(updateOrderStatusSchema),
  auditMiddleware("STATUS_CHANGE", "Order", (req) => `Order ${req.params.id} status → ${req.body.status}`),
  updateOrderStatus,
);

router.delete("/:id",
  protect,
  authorize("admin"),
  validateParams(orderIdParamSchema),
  auditMiddleware("DELETE", "Order", (req) => `Order ${req.params.id} deleted`),
  deleteOrder,
);

module.exports = router;