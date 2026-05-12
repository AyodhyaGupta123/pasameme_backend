const PaymentOtp = require("../models/PaymentOtp");
const Card = require("../models/Card");

// This would be called after OTP verification
exports.processPayment = async (req, res) => {
  try {
    const { userId, cardId, amount, otp } = req.body;
    // 1. Verify OTP
    const record = await PaymentOtp.findOne({
      userId,
      cardId,
      amount,
      otp,
      expiresAt: { $gt: new Date() },
      verified: true,
    });
    if (!record)
      return res.status(400).json({ error: "OTP not verified or expired" });
    // 2. (Optional) Fetch card info for payment gateway
    const card = await Card.findOne({ userId, cardId });
    if (!card) return res.status(400).json({ error: "Card not found" });
    // 3. Integrate with payment gateway here (Stripe, Razorpay, etc.)
    // For demo, just return success
    // 4. Delete OTP after use
    await PaymentOtp.deleteMany({ userId, cardId });
    res.json({ success: true, message: "Payment processed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
