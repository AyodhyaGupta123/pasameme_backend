const WithdrawRequest = require("../models/WithdrawRequest");
const Wallet = require("../models/Wallet");
const User = require("../models/User");

const { sendStripePayout } = require("../services/stripeService");

// Approve a withdrawal request and mark as processed
exports.approveWithdraw = async (req, res) => {
  try {
    const { withdrawId } = req.body;
    if (!withdrawId) {
      return res
        .status(400)
        .json({ success: false, error: "withdrawId required" });
    }
    const withdraw = await WithdrawRequest.findById(withdrawId);
    if (!withdraw || withdraw.status !== "pending") {
      return res
        .status(404)
        .json({
          success: false,
          error: "Withdraw request not found or already processed",
        });
    }
    // Get user and payout destination (replace with real destination logic)
    const user = await User.findById(withdraw.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    // TODO: Replace with actual Stripe destination (e.g., user.stripeAccountId or external account)
    const destination =
      user.stripeDestination || process.env.DEFAULT_STRIPE_DESTINATION;
    if (!destination) {
      return res
        .status(400)
        .json({ success: false, error: "No Stripe destination set for user" });
    }
    // Stripe expects amount in cents
    const amountCents = Math.round(withdraw.amount * 100);
    let payoutResult = null;
    try {
      payoutResult = await sendStripePayout({
        user,
        amount: amountCents,
        currency: "usd",
        destination,
      });
    } catch (stripeErr) {
      return res
        .status(500)
        .json({
          success: false,
          error: `Stripe payout failed: ${stripeErr.message}`,
        });
    }
    // Mark as processed
    withdraw.status = "processed";
    withdraw.processedAt = new Date();
    await withdraw.save();
    res.json({
      success: true,
      message: "Withdrawal approved and payout processed.",
      withdraw,
      payout: payoutResult,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Reject a withdrawal request
exports.rejectWithdraw = async (req, res) => {
  try {
    const { withdrawId } = req.body;
    if (!withdrawId) {
      return res
        .status(400)
        .json({ success: false, error: "withdrawId required" });
    }
    const withdraw = await WithdrawRequest.findById(withdrawId);
    if (!withdraw || withdraw.status !== "pending") {
      return res.status(404).json({
        success: false,
        error: "Withdraw request not found or already processed",
      });
    }
    // Mark as rejected
    withdraw.status = "rejected";
    withdraw.processedAt = new Date();
    await withdraw.save();
    // Optionally, refund amount to user wallet here
    res.json({ success: true, message: "Withdrawal rejected.", withdraw });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
