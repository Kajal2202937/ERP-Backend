const express = require("express");
const router = express.Router();

const { createUser } = require("../controllers/authController");

const {
  getMe,
  getUsers,
  getUserById,
  updateMe,
  updateUser,
  deleteMe,
  deleteUser,
} = require("../controllers/userController");

const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.delete("/me", protect, deleteMe);

router.post("/admin", protect, authorize("admin", "manager"), createUser);

router.get("/", protect, authorize("admin", "manager"), getUsers);
router.get("/:id", protect, authorize("admin", "manager"), getUserById);
router.put("/:id", protect, authorize("admin", "manager"), updateUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
