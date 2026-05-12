const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");
const { authMiddleware } = require("../middlewares/auth");

// Request OTP for deposit or withdrawal
router.post("/request", authMiddleware, otpController.requestOtp);

// Verify OTP for deposit or withdrawal
router.post("/verify", authMiddleware, otpController.verifyOtp);

module.exports = router;
