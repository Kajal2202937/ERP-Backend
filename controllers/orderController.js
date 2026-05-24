const orderService = require("../services/orderService");
const asyncHandler2 = require("../middleware/asyncHandler");

exports.createOrder = asyncHandler2(async (req, res) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json({ success: true, data: order });
});

exports.getOrders = asyncHandler2(async (req, res) => {
  const data = await orderService.getOrders(req.query);
  res.json({ success: true, ...data });
});

exports.updateOrderStatus = asyncHandler2(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.params.id,
    req.body.status,
  );
  res.json({ success: true, data: order });
});

exports.deleteOrder = asyncHandler2(async (req, res) => {
  const result = await orderService.deleteOrder(req.params.id);
  res.json({ success: true, message: result.message });
});
