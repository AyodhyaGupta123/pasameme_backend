const WithdrawRequest = require("../models/WithdrawRequest");
const Wallet = require("../models/Wallet");
const User = require("../models/User");

// Helper: Check if 7 days passed since last deposit
function isSevenDaysPassed(date) {
  const now = new Date();
  const diff = now - new Date(date);
  return diff >= 7 * 24 * 60 * 60 * 1000;
}

const OtpRequest = require("../models/OtpRequest");

exports.requestWithdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, otp } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }
    // OTP verification required
    if (!otp) {
      return res.status(400).json({ success: false, error: "OTP required" });
    }
    const otpDoc = await OtpRequest.findOne({
      userId,
      type: "withdraw",
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    });
    if (!otpDoc) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired OTP" });
    }
    otpDoc.verified = true;
    await otpDoc.save();

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.realUsdBalance < amount) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient balance" });
    }
    // Check last deposit date (createdAt)
    if (!isSevenDaysPassed(wallet.updatedAt || wallet.createdAt)) {
      return res.status(400).json({
        success: false,
        error: "Withdrawal allowed only after 7 days from last deposit.",
      });
    }
    // Create withdraw request
    const withdraw = await WithdrawRequest.create({
      userId,
      amount,
      status: "pending",
      requestedAt: new Date(),
    });
    // Optionally, lock funds or deduct immediately (here: deduct immediately)
    wallet.realUsdBalance -= amount;
    wallet.usdBalance = wallet.realUsdBalance;
    await wallet.save();
    // Optionally, notify admin for manual approval
    res.json({
      success: true,
      message: "Withdraw request submitted.",
      withdraw,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// (Optional) Admin approve/reject logic can be added here
