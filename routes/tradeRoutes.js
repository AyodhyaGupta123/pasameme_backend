const express = require("express");
const router = express.Router();

const { placeTrade } = require("../controllers/tradeController");
const { getUserPositions } = require("../controllers/tradeController");

router.post("/place", placeTrade);
router.get("/positions", getUserPositions);

module.exports = router;
