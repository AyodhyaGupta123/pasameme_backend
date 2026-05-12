const express = require("express");
const router = express.Router();
const Card = require("../models/Card");
const crypto = require("crypto");

// Encrypt card number (for demo, use a real KMS/tokenization in prod)
function encryptCardNumber(cardNumber) {
  const cipher = crypto.createCipher("aes-256-ctr", process.env.CARD_SECRET || "demo_secret");
  let crypted = cipher.update(cardNumber, "utf8", "hex");
  crypted += cipher.final("hex");
  return crypted;
}

// Save new card
router.post("/save", async (req, res) => {
  try {
    const { userId, cardNumber, expiry, holderName, brand } = req.body;
    if (!userId || !cardNumber || !expiry || !holderName)
      return res.status(400).json({ error: "Missing required fields" });
    const encryptedCardNumber = encryptCardNumber(cardNumber);
    const last4 = cardNumber.slice(-4);
    const cardId = crypto.randomBytes(8).toString("hex");
    const card = await Card.create({
      userId,
      cardId,
      last4,
      expiry,
      holderName,
      brand,
      encryptedCardNumber,
    });
    res.json({ success: true, card: { cardId, last4, expiry, holderName, brand } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get saved cards for user
router.get("/user/:userId", async (req, res) => {
  try {
    const cards = await Card.find({ userId: req.params.userId }).select("-encryptedCardNumber");
    res.json({ success: true, cards });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
