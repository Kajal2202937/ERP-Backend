const express = require("express");
const router = express.Router();

const {
  createUser,
  getMe,
  getUsers,
  getUserById,
  updateMe,
  updateUser,
  deleteMe,
  deleteUser,
} = require("../controllers/userController");

const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/admin", protect, authorize("admin"), createUser);

router.get("/me", protect, getMe);

router.get("/", protect, authorize("admin", "manager"), getUsers);

router.get("/:id", protect, authorize("admin", "manager"), getUserById);

router.put("/me", protect, updateMe);

router.put("/:id", protect, authorize("admin", "manager"), updateUser);

router.delete("/me", protect, deleteMe);

router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
