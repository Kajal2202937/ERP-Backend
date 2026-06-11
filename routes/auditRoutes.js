const express = require("express");
const router = express.Router();
const {
  getAuditLogs,
  getAuditLogById,
} = require("../controllers/auditController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", protect, authorize("admin"), getAuditLogs);
router.get("/:id", protect, authorize("admin"), getAuditLogById);

module.exports = router;
