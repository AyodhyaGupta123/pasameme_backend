const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
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

    lockedBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDeposits: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWithdrawals: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalTradeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastTradeAt: {
      type: Date,
      default: null,
    },

    lastDepositAt: {
      type: Date,
      default: null,
    },

    lastWithdrawAt: {
      type: Date,
      default: null,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const toNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
};

walletSchema.pre("save", function () {
  this.usdBalance = toNumber(this.usdBalance);
  this.realUsdBalance = toNumber(this.realUsdBalance);
  this.tokenBalance = toNumber(this.tokenBalance);
  this.lockedBalance = toNumber(this.lockedBalance);
  this.totalDeposits = toNumber(this.totalDeposits);
  this.totalWithdrawals = toNumber(this.totalWithdrawals);
  this.totalTradeAmount = toNumber(this.totalTradeAmount);
  this.lastUpdated = new Date();
});

walletSchema.methods.addBalance = async function (amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid amount");
  }

  this.usdBalance = toNumber(this.usdBalance) + value;
  this.realUsdBalance = toNumber(this.realUsdBalance) + value;
  this.totalDeposits = toNumber(this.totalDeposits) + value;
  this.lastDepositAt = new Date();

  await this.save();
  return this;
};

walletSchema.methods.deductBalance = async function (amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid amount");
  }

  const currentBalance = toNumber(this.realUsdBalance);

  if (currentBalance < value) {
    throw new Error("Insufficient wallet balance");
  }

  this.realUsdBalance = currentBalance - value;
  this.usdBalance = Math.max(0, toNumber(this.usdBalance) - value);
  this.totalTradeAmount = toNumber(this.totalTradeAmount) + value;
  this.lastTradeAt = new Date();

  await this.save();
  return this;
};

walletSchema.methods.addToken = async function (amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid token amount");
  }

  this.tokenBalance = toNumber(this.tokenBalance) + value;

  await this.save();
  return this;
};

walletSchema.methods.deductToken = async function (amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid token amount");
  }

  const currentTokenBalance = toNumber(this.tokenBalance);

  if (currentTokenBalance < value) {
    throw new Error("Insufficient token balance");
  }

  this.tokenBalance = currentTokenBalance - value;

  await this.save();
  return this;
};

walletSchema.methods.withdrawBalance = async function (amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid amount");
  }

  const currentBalance = toNumber(this.realUsdBalance);

  if (currentBalance < value) {
    throw new Error("Insufficient wallet balance");
  }

  this.realUsdBalance = currentBalance - value;
  this.usdBalance = Math.max(0, toNumber(this.usdBalance) - value);
  this.totalWithdrawals = toNumber(this.totalWithdrawals) + value;
  this.lastWithdrawAt = new Date();

  await this.save();
  return this;
};

walletSchema.statics.getOrCreateWallet = async function (userId) {
  let wallet = await this.findOne({ userId });

  if (!wallet) {
    wallet = await this.create({
      userId,
      usdBalance: 0,
      realUsdBalance: 0,
      tokenBalance: 0,
      lockedBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalTradeAmount: 0,
    });
  }

  return wallet;
};

const Wallet =
  mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);

module.exports = Wallet;