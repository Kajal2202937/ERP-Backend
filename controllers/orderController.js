const orderService = require("../services/orderService");

// CREATE ORDER
exports.createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body);

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err.message);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET ORDERS
exports.getOrders = async (req, res) => {
  try {
    const data = await orderService.getOrders(req.query);

    res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// UPDATE STATUS
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
    );

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE ORDER
exports.deleteOrder = async (req, res) => {
  try {
    const result = await orderService.deleteOrder(req.params.id);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
