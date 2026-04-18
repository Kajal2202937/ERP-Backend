const Order = require("../models/Order");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const { updateStock } = require("./stockService");

const createOrder = async (data) => {
  const { product, quantity } = data;

  if (!product || !quantity) {
    throw new Error("Product and quantity are required");
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error("Invalid quantity");
  }

  const productData = await Product.findById(product);
  if (!productData) throw new Error("Product not found");

  if (productData.costPrice === undefined || productData.costPrice === null) {
    throw new Error(
      "Product cost price is missing. Please update product first.",
    );
  }

  const inventory = await Inventory.findOne({ product: productData._id });
  if (!inventory) throw new Error("Inventory not found");

  if (inventory.quantity < qty) {
    throw new Error("Insufficient stock");
  }

  const price = productData.price;
  const costPrice = productData.costPrice;
  const totalPrice = price * qty;

  const order = await Order.create({
    product: productData._id,
    quantity: qty,
    price,
    costPrice,
    totalPrice,
    status: "completed",
  });

  try {
    await updateStock({
      productId: productData._id,
      quantity: qty,
      type: "OUT",
      source: "ORDER",
      referenceId: order._id,
    });
  } catch (err) {
    await Order.findByIdAndDelete(order._id);
    throw err;
  }

  return order;
};

const getOrders = async (query) => {
  let { page = 1, limit = 10, search = "", status } = query;

  page = parseInt(page);
  limit = parseInt(limit);

  const filter = {};
  if (status) filter.status = status;

  let orders = await Order.find(filter)
    .populate({
      path: "product",
      populate: {
        path: "supplier",
        select: "name email phone",
      },
    })
    .sort({ createdAt: -1 });

  if (search) {
    const keyword = search.toLowerCase();
    orders = orders.filter((o) =>
      o.product?.name?.toLowerCase().includes(keyword),
    );
  }

  const total = orders.length;
  const pages = Math.ceil(total / limit);

  const paginated = orders.slice((page - 1) * limit, page * limit);

  return { data: paginated, total, page, pages };
};

const updateOrderStatus = async (id, status) => {
  const allowed = ["pending", "completed", "cancelled"];

  if (!allowed.includes(status)) {
    throw new Error("Invalid status");
  }

  const order = await Order.findById(id);
  if (!order) throw new Error("Order not found");

  if (order.status !== "cancelled" && status === "cancelled") {
    await updateStock({
      productId: order.product,
      quantity: order.quantity,
      type: "IN",
      source: "ORDER_CANCEL",
      referenceId: order._id,
    });
  }

  order.status = status;
  await order.save();

  return order;
};

const deleteOrder = async (id) => {
  const order = await Order.findById(id);
  if (!order) throw new Error("Order not found");

  await updateStock({
    productId: order.product,
    quantity: order.quantity,
    type: "IN",
    source: "ORDER_DELETE",
    referenceId: order._id,
  });

  await Order.findByIdAndDelete(id);

  return { message: "Order deleted & stock restored" };
};

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder,
};
