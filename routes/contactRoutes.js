const express = require("express");
const router = express.Router();
const {
  createContact,
  getContacts,
  updateContact,
  deleteContact,
  replyContact,
} = require("../controllers/contactController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", createContact);
router.get("/", protect, getContacts);
router.put("/:id", protect, updateContact);
router.delete("/:id", protect, deleteContact);
router.post("/:id/reply", replyContact);
module.exports = router;
