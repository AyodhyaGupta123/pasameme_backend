const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    usdBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    realUsdBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    tokenBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
