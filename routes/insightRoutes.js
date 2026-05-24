const express10 = require("express");
const router10 = express10.Router();
const { getAIInsights } = require("../controllers/insightController");
const { protect: p10 } = require("../middleware/authMiddleware");

router10.get("/", p10, getAIInsights);

module.exports = router10;
