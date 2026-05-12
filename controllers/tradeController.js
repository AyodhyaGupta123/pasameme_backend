const User = require("../models/User.js");
const Position = require("../models/Position.js");

const getUserPositions = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId in query" });
    }
    const positions = await Position.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, positions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const placeTrade = async (req, res) => {
  try {
    const { userId, side, price, size, type } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const requiredMargin = (price * size) / 20;

    if (user.balance < requiredMargin) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    user.balance -= requiredMargin;
    await user.save();

    const position = await Position.create({
      userId,
      symbol: "BTCUSDT",
      side,
      type,
      price,
      size,
      leverage: 20,
    });

    res.status(201).json({
      success: true,
      position,
      remainingBalance: user.balance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUserPositions, placeTrade };