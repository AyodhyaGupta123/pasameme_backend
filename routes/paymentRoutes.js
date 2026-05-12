const express = require("express");
const router = express.Router();
const {
  createPaymentIntent,
  confirmPaymentIntent,
} = require("../services/stripeService");
const { processPayment } = require("../controllers/paymentController");
// Process payment after OTP verification
router.post("/process", processPayment);

// Create a payment intent
router.post("/create-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });
    const paymentIntent = await createPaymentIntent(amount, currency);
    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm a payment intent
router.post("/confirm-intent", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await confirmPaymentIntent(paymentIntentId);
    res.json({ success: true, paymentIntent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
