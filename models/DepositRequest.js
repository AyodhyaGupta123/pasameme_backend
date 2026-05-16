const mongoose = require("mongoose");

const depositRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    method: {
      type: String,
      default: "manual_bank_upi",
      enum: ["manual_bank_upi", "card", "upi", "other"],
    },
    transactionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

const DepositRequest = mongoose.model("DepositRequest", depositRequestSchema);

module.exports = DepositRequest;
