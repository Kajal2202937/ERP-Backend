const express = require("express");
const router = express.Router();
const controller = require("../controllers/inventoryController");

router.post("/", controller.createInventory);
router.get("/", controller.getInventory);
router.post("/add", controller.addStock);
router.put("/update", controller.updateStock);
router.put("/disable", controller.disableInventory);
router.put("/enable", controller.enableInventory);
module.exports = router;
