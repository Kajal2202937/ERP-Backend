const express = require("express");
const router = express.Router();

const { getAIInsights } = require("../controllers/insightController");


router.get("/", getAIInsights);

module.exports = router;