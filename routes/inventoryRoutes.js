const express4 = require("express");
const router4 = express4.Router();
const inv = require("../controllers/inventoryController");
const { protect: p4, authorize: a4 } = require("../middleware/authMiddleware");

router4.post("/", p4, inv.createInventory);
router4.get("/", p4, inv.getInventory);
router4.post("/add", p4, inv.addStock);
router4.put("/update", p4, inv.updateStock);
router4.put("/disable", p4, inv.disableInventory);
router4.put("/enable", p4, inv.enableInventory);
router4.delete("/", p4, a4("admin", "manager"), inv.deleteInventory);

module.exports = router4;
