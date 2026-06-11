const express = require("express");
const router = express.Router();
const pc = require("../controllers/productController");
const { protect: p, authorize: a } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} = require("../validation/productSchemas");

router.get("/low-stock", p, pc.getLowStockProducts);

router.post("/", p, validate(createProductSchema), pc.createProduct);
router.get("/", p, validate(productQuerySchema, "query"), pc.getProducts);
router.get("/:id", p, pc.getProduct);
router.put("/:id", p, validate(updateProductSchema), pc.updateProduct);
router.delete("/:id", p, a("admin"), pc.deleteProduct);

module.exports = router;
