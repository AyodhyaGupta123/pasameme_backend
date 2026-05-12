const express = require("express");
const router = express.Router();
const PaymentOtp = require("../models/PaymentOtp");
const crypto = require("crypto");

// Generate OTP and store
router.post("/generate", async (req, res) => {
  try {
    const { userId, cardId, amount } = req.body;
    if (!userId || !cardId || !amount)
      return res.status(400).json({ error: "Missing fields" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
    await PaymentOtp.create({ userId, cardId, amount, otp, expiresAt });
    // TODO: Integrate SMS API to send OTP to user's registered mobile
    res.json({ success: true, otp }); // For demo, return OTP in response
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP
router.post("/verify", async (req, res) => {
  try {
    const { userId, cardId, amount, otp } = req.body;
    const record = await PaymentOtp.findOne({
      userId,
      cardId,
      amount,
      otp,
      expiresAt: { $gt: new Date() },
      verified: false,
    });
    if (!record)
      return res.status(400).json({ error: "Invalid or expired OTP" });
    record.verified = true;
    await record.save();
    // Optionally, delete all OTPs for this user/card
    await PaymentOtp.deleteMany({ userId, cardId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
