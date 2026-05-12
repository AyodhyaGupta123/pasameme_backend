const mongoose = require("mongoose");

const otpRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: ["deposit", "withdraw"], required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const OtpRequest = mongoose.model("OtpRequest", otpRequestSchema);
module.exports = OtpRequest;
