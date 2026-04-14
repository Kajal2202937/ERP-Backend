const express = require("express");
const router = express.Router();

const {
  createContact,
  getContacts,
  updateContact,
  deleteContact,
} = require("../controllers/contactController");

const { protect } = require("../middleware/authMiddleware");

/**
 * ================================
 * PUBLIC ROUTE
 * ================================
 */

// Send contact message (no auth)
router.post("/", createContact);

/**
 * ================================
 * PROTECTED ROUTES (AUTH ONLY)
 * ================================
 */

// Get all messages
router.get("/", protect, getContacts);

// Update message
router.put("/:id", protect, updateContact);

// Delete message
router.delete("/:id", protect, deleteContact);

module.exports = router;