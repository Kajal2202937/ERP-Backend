const express7 = require("express");
const router7 = express7.Router();
const prc = require("../controllers/productionController");
const { protect: p7, authorize: a7 } = require("../middleware/authMiddleware");

router7.get("/report/download", p7, prc.getProductionReport);

router7.post("/", p7, prc.createProduction);
router7.get("/", p7, prc.getProductions);
router7.put("/:id", p7, prc.updateProduction);
router7.delete("/:id", p7, a7("admin"), prc.deleteProduction);

module.exports = router7;
