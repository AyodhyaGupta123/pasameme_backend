const express = require("express");
const router = express.Router();
const { requestWithdraw } = require("../controllers/withdrawController");
const { authMiddleware } = require("../middlewares/auth");

// User withdraw request
router.post("/request", authMiddleware, requestWithdraw);

module.exports = router;
