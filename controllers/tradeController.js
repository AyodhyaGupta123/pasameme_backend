const User = require("../models/User.js");
const Position = require("../models/Position.js");
const Wallet = require("../models/Wallet.js");

const getUserPositions = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId in query",
      });
    }

    const positions = await Position.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      positions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const placeTrade = async (req, res) => {
  try {
    const { userId, side, price, type, symbol, amount } = req.body;

const missingFields = [];

if (!userId) missingFields.push("userId");
if (!side) missingFields.push("side");
if (price === undefined || price === null || price === "") {
  missingFields.push("price");
}
if (!type) missingFields.push("type");
if (amount === undefined || amount === null || amount === "") {
  missingFields.push("amount");
}

if (missingFields.length > 0) {
  return res.status(400).json({
    success: false,
    message: `Missing fields: ${missingFields.join(", ")}`,
    receivedBody: req.body,
  });
}

    const tradePrice = Number(price);
    const tradeAmount = Number(amount);
    const tradeSize =
      tradePrice > 0 && tradeAmount > 0 ? tradeAmount / tradePrice : 0;

    if (
      !Number.isFinite(tradePrice) ||
      !Number.isFinite(tradeAmount) ||
      !Number.isFinite(tradeSize) ||
      tradePrice <= 0 ||
      tradeAmount <= 0 ||
      tradeSize <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid trade amount, price or size",
        receivedBody: req.body,
      });
    }

    if (!["buy", "sell"].includes(String(side).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid trade side",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const leverage = 20;
    const requiredMargin = tradeAmount;

    const currentWalletBalance = Number(
      wallet.realUsdBalance ?? wallet.usdBalance ?? 0,
    );

    if (currentWalletBalance < requiredMargin) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        currentBalance: currentWalletBalance,
        requiredMargin,
      });
    }

    if (typeof wallet.deductBalance === "function") {
      await wallet.deductBalance(requiredMargin);
    } else {
      wallet.realUsdBalance = currentWalletBalance - requiredMargin;
      wallet.usdBalance = Number(wallet.usdBalance || 0) - requiredMargin;
      wallet.lastUpdated = new Date();
      wallet.lastTradeAt = new Date();
      await wallet.save();
    }

    user.balance = Number(wallet.realUsdBalance || 0);
    await user.save();

    const position = await Position.create({
      userId,
      symbol: symbol || "BTCUSDT",
      side: String(side).toLowerCase(),
      type,
      price: tradePrice,
      size: tradeSize,
      leverage,
      margin: requiredMargin,
      totalAmount: tradeAmount,
    });

    return res.status(201).json({
      success: true,
      message: "Trade placed successfully",
      position,
      wallet: {
        usdBalance: wallet.usdBalance,
        realUsdBalance: wallet.realUsdBalance,
        tokenBalance: wallet.tokenBalance || 0,
      },
      remainingBalance: wallet.realUsdBalance,
      requiredMargin,
      totalTradeAmount: tradeAmount,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = { getUserPositions, placeTrade };
