const OtpRequest = require("../models/OtpRequest");
const User = require("../models/User");
const crypto = require("crypto");

// Dummy sendOtp function (replace with real SMS/email integration)
async function sendOtpToUser(user, otp) {
  // TODO: Integrate with SMS/email provider
  console.log(`OTP for ${user.email}: ${otp}`);
}

exports.requestOtp = async (req, res) => {
  try {
    const { type } = req.body; // "deposit" or "withdraw"
    const userId = req.user.id;
    if (!type || !["deposit", "withdraw"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid OTP type" });
    }
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    await OtpRequest.create({ userId, type, otp, expiresAt });
    await sendOtpToUser(user, otp);
    res.json({ success: true, message: "OTP sent" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { type, otp } = req.body;
    const userId = req.user.id;
    const otpDoc = await OtpRequest.findOne({
      userId,
      type,
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    });
    if (!otpDoc)
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired OTP" });
    otpDoc.verified = true;
    await otpDoc.save();
    res.json({ success: true, message: "OTP verified" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
