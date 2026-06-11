const express = require("express");
const router = express.Router();
const { getAIInsights } = require("../controllers/insightController");
const { protect: p } = require("../middleware/authMiddleware");

router.get("/", p, getAIInsights);

module.exports = router;
