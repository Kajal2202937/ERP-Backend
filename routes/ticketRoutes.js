const express = require("express");
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketStats,
  getTicket,
  replyTicket,
  updateTicketStatus,
  updateTicketPriority,
  resolveTicket,
  markSeen,
  deleteTicket,
} = require("../controllers/ticketController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/optionalAuth");

router.post("/", createTicket);

router.post("/:id/reply", optionalAuth, replyTicket);

router.post("/:id/seen", optionalAuth, markSeen);

router.get("/stats", protect, authorize("admin"), getTicketStats);
router.get("/", protect, authorize("admin"), getTickets);
router.get("/:id", protect, authorize("admin"), getTicket);
router.patch("/:id/status", protect, authorize("admin"), updateTicketStatus);
router.patch(
  "/:id/priority",
  protect,
  authorize("admin"),
  updateTicketPriority,
);
router.post("/:id/resolve", protect, authorize("admin"), resolveTicket);
router.delete("/:id", protect, authorize("admin"), deleteTicket);

module.exports = router;
