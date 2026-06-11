const asyncHandler = require("../middleware/asyncHandler");
const orderService = require("../services/orderService");
const {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendOrderInvoiceEmail,
} = require("../utils/sendOrderEmail");
const {
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderDeleted,
} = require("../socket/ticketSocket");

exports.createOrder = asyncHandler(async (req, res) => {
  const { product, quantity, customer, notes } = req.body;

  const order = await orderService.createOrder({
    product,
    quantity,
    customer,
    notes,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: order });

  orderService
    .getOrderById(order._id)
    .then((populated) => {
      emitOrderCreated(populated);

      sendOrderConfirmationEmail(populated).catch((err) => {
        console.error(
          "[OrderController] Confirmation email failed:",
          err.message,
        );
      });
    })
    .catch((err) => {
      console.error(
        "[OrderController] Post-create notification failed:",
        err.message,
      );
    });
});

exports.getOrders = asyncHandler(async (req, res) => {
  const data = await orderService.getOrders(req.query);
  res.json({ success: true, ...data });
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json({ success: true, data: order });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const existing = await orderService.getOrderById(req.params.id);
  const oldStatus = existing.status;

  const order = await orderService.updateOrderStatus(
    req.params.id,
    req.body.status,
    req.user._id,
    req.body.note || "",
  );

  res.json({ success: true, data: order });

  orderService
    .getOrderById(order._id)
    .then((populated) => {
      emitOrderUpdated(populated, oldStatus, req.user.name || req.user.email);

      sendOrderStatusEmail(populated, oldStatus).catch((err) => {
        console.error("[OrderController] Status email failed:", err.message);
      });
    })
    .catch((err) => {
      console.error(
        "[OrderController] Post-update notification failed:",
        err.message,
      );
    });
});

exports.deleteOrder = asyncHandler(async (req, res) => {
  const existing = await orderService.getOrderById(req.params.id);
  const { _id, orderNumber } = existing;

  const result = await orderService.deleteOrder(req.params.id);

  res.json({ success: true, message: result.message });

  emitOrderDeleted(_id, orderNumber);
});

exports.resendInvoice = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);

  if (!order.customer?.email || !order.customer.email.includes("@")) {
    return res.status(400).json({
      success: false,
      message:
        "No customer email on this order. Update the order with a customer email first.",
    });
  }

  await sendOrderInvoiceEmail(order);

  res.json({
    success: true,
    message: `Invoice sent to ${order.customer.email}`,
  });
});
