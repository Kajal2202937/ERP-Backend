const express2 = require("express");
const router2 = express2.Router();
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
const { protect: p2, authorize: a2 } = require("../middleware/authMiddleware");

router2.post("/admin", p2, a2("admin"), createUser);
router2.get("/me", p2, getMe);
router2.put("/me", p2, updateMe);
router2.delete("/me", p2, deleteMe);
router2.get("/", p2, a2("admin", "manager"), getUsers);
router2.get("/:id", p2, a2("admin", "manager"), getUserById);
router2.put("/:id", p2, a2("admin", "manager"), updateUser);
router2.delete("/:id", p2, a2("admin"), deleteUser);

module.exports = router2;
