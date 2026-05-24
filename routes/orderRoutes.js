const express5 = require("express");
const router5 = express5.Router();
const {
  createOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");
const { protect: p5, authorize: a5 } = require("../middleware/authMiddleware");

router5.post("/", p5, createOrder);
router5.get("/", p5, getOrders);
router5.patch("/:id/status", p5, updateOrderStatus);
router5.delete("/:id", p5, a5("admin"), deleteOrder);

module.exports = router5;
