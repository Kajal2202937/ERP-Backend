const express = require("express");
const router = express.Router();

const controller = require("../controllers/productionController");

router.post("/", controller.createProduction);
router.get("/", controller.getProductions);
router.put("/:id", controller.updateProduction);
router.delete("/:id", controller.deleteProduction);
router.get("/report/download", controller.getProductionReport);

module.exports = router;