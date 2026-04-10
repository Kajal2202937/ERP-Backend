const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// API routes
router.post("/", productController.createProduct);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.get("/", productController.getProducts);
router.get("/low-stock", productController.getLowStockProducts);

module.exports = router;