const express = require("express");
const router = express.Router();
const inv = require("../controllers/inventoryController");
const { protect: p, authorize: a } = require("../middleware/authMiddleware");

router.post("/", p, inv.createInventory);
router.get("/", p, inv.getInventory);
router.post("/add", p, inv.addStock);
router.put("/update", p, inv.updateStock);
router.put("/disable", p, inv.disableInventory);
router.put("/enable", p, inv.enableInventory);
router.delete("/", p, a("admin", "manager"), inv.deleteInventory);

module.exports = router;
