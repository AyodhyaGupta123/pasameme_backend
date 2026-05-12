// Wallet microservice logic (example)
// In a real microservices setup, this would be a separate repo/app with its own server

const Wallet = require("../models/Wallet");

const getUserWallet = async (userId) => {
  return await Wallet.findOne({ user: userId });
};

const updateWalletBalance = async (userId, amount) => {
  return await Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: { balance: amount } },
    { new: true },
  );
};

module.exports = {
  getUserWallet,
  updateWalletBalance,
};
