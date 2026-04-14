const express = require("express");
const router = express.Router();

const { getAIInsights } = require("../controllers/insightController");

// GET /api/insights
router.get("/", getAIInsights);

module.exports = router;