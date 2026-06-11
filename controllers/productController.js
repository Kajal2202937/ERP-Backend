const productService = require("../services/productService");
const asyncHandler = require("../middleware/asyncHandler");

exports.createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
});

exports.getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getAllProducts(req.query);
  res.json({ success: true, ...result });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  res.json({ success: true, data: product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ success: true, data: product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res.json({ success: true, message: "Product deleted successfully" });
});

exports.getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await productService.getLowStockProducts();
  res.json({ success: true, data: products });
});
