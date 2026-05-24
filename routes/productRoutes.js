const express6 = require("express");
const router6 = express6.Router();
const pc = require("../controllers/productController");
const { protect: p6, authorize: a6 } = require("../middleware/authMiddleware");

router6.get("/low-stock", p6, pc.getLowStockProducts);

router6.post("/", p6, pc.createProduct);
router6.get("/", p6, pc.getProducts);
router6.get("/:id", p6, pc.getProduct);
router6.put("/:id", p6, pc.updateProduct);
router6.delete("/:id", p6, a6("admin"), pc.deleteProduct);

module.exports = router6;
