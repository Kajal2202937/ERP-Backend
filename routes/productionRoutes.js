const express = require("express");
const router = express.Router();

const prc = require("../controllers/productionController");

const { protect, authorize } = require("../middleware/authMiddleware");
const { validate, validateQuery } = require("../middleware/validate");
const { auditMiddleware } = require("../middleware/auditLog");

const {
  createProductionSchema,
  updateProductionSchema,
  productionQuerySchema,
} = require("../validation/productionSchemas");

router.get("/report/download", protect, prc.getProductionReport);

router.get(
  "/",
  protect,
  validateQuery(productionQuerySchema),
  prc.getProductions,
);

router.post(
  "/",
  protect,
  validate(createProductionSchema),
  auditMiddleware(
    "CREATE",
    "Production",
    (req) => `Production run created for product ${req.body.product}`,
  ),
  prc.createProduction,
);

router.put(
  "/:id",
  protect,
  validate(updateProductionSchema),
  auditMiddleware(
    "UPDATE",
    "Production",
    (req) => `Production ${req.params.id} updated`,
  ),
  prc.updateProduction,
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  auditMiddleware(
    "DELETE",
    "Production",
    (req) => `Production ${req.params.id} deleted`,
  ),
  prc.deleteProduction,
);

module.exports = router;
