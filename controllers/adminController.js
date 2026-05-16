const WithdrawRequest = require("../models/WithdrawRequest");
const DepositRequest = require("../models/DepositRequest");
const Wallet = require("../models/Wallet");
const User = require("../models/User");

const { sendStripePayout } = require("../services/stripeService");

const safeSendStripePayout = async (params) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, message: "Stripe not configured. Skipping actual payout." };
  }
  return await sendStripePayout(params);
};

const buildDashboardStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalDeposits = await DepositRequest.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const pendingDeposits = await DepositRequest.countDocuments({ status: "pending" });
  const pendingWithdraws = await WithdrawRequest.countDocuments({ status: "pending" });
  const walletVolume = await Wallet.aggregate([
    { $group: { _id: null, total: { $sum: "$realUsdBalance" } } },
  ]);

  return {
    totalUsers,
    totalDeposits: totalDeposits[0]?.total || 0,
    pendingRequests: pendingDeposits + pendingWithdraws,
    walletVolume: walletVolume[0]?.total || 0,
  };
};

exports.getDashboard = async (req, res) => {
  try {
    const stats = await buildDashboardStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLatestRequests = async (req, res) => {
  try {
    const deposits = await DepositRequest.find()
      .populate("userId", "username email")
      .sort({ requestedAt: -1 })
      .limit(10)
      .lean();

    const withdraws = await WithdrawRequest.find()
      .populate("userId", "username email")
      .sort({ requestedAt: -1 })
      .limit(10)
      .lean();

    const latestRequests = [...deposits, ...withdraws]
      .map((item) => ({
        id: item._id,
        user: item.userId?.username || item.userId?.email || "Unknown",
        type: item.amount && item.transactionId ? "Deposit" : "Withdrawal",
        amount: item.amount,
        status: item.status,
        createdAt: item.requestedAt || item.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({ success: true, latestRequests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDepositRequests = async (req, res) => {
  try {
    const deposits = await DepositRequest.find()
      .populate("userId", "username email")
      .sort({ requestedAt: -1 });

    res.json({ success: true, deposits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getWithdrawRequests = async (req, res) => {
  try {
    const withdraws = await WithdrawRequest.find()
      .populate("userId", "username email")
      .sort({ requestedAt: -1 });

    res.json({ success: true, withdraws });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.approveDeposit = async (req, res) => {
  try {
    const { depositId } = req.body;
    if (!depositId) {
      return res.status(400).json({ success: false, error: "depositId required" });
    }

    const deposit = await DepositRequest.findById(depositId);
    if (!deposit || deposit.status !== "pending") {
      return res.status(404).json({
        success: false,
        error: "Deposit request not found or already processed",
      });
    }

    const wallet = await Wallet.findOne({ userId: deposit.userId });
    const user = await User.findById(deposit.userId);

    if (!wallet || !user) {
      return res.status(404).json({ success: false, error: "User wallet or user not found" });
    }

    wallet.realUsdBalance = Number(wallet.realUsdBalance || 0) + deposit.amount;
    wallet.usdBalance = wallet.realUsdBalance;
    wallet.lastUpdated = new Date();
    await wallet.save();

    user.balance = wallet.realUsdBalance;
    await user.save();

    deposit.status = "approved";
    deposit.processedAt = new Date();
    await deposit.save();

    res.json({
      success: true,
      message: "Deposit approved and user wallet updated.",
      deposit,
      wallet,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.rejectDeposit = async (req, res) => {
  try {
    const { depositId } = req.body;
    if (!depositId) {
      return res.status(400).json({ success: false, error: "depositId required" });
    }

    const deposit = await DepositRequest.findById(depositId);
    if (!deposit || deposit.status !== "pending") {
      return res.status(404).json({
        success: false,
        error: "Deposit request not found or already processed",
      });
    }

    deposit.status = "rejected";
    deposit.processedAt = new Date();
    await deposit.save();

    res.json({ success: true, message: "Deposit request rejected.", deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.approveWithdraw = async (req, res) => {
  try {
    const { withdrawId } = req.body;
    if (!withdrawId) {
      return res.status(400).json({ success: false, error: "withdrawId required" });
    }
    const withdraw = await WithdrawRequest.findById(withdrawId);
    if (!withdraw || withdraw.status !== "pending") {
      return res.status(404).json({
        success: false,
        error: "Withdraw request not found or already processed",
      });
    }

    const user = await User.findById(withdraw.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const destination =
      user.stripeDestination || process.env.DEFAULT_STRIPE_DESTINATION;
    let payoutResult = null;
    if (destination && process.env.STRIPE_SECRET_KEY) {
      const amountCents = Math.round(withdraw.amount * 100);
      payoutResult = await safeSendStripePayout({
        user,
        amount: amountCents,
        currency: "usd",
        destination,
      });
    }

    withdraw.status = "processed";
    withdraw.processedAt = new Date();
    await withdraw.save();

    res.json({
      success: true,
      message: "Withdrawal approved.",
      withdraw,
      payout: payoutResult,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.rejectWithdraw = async (req, res) => {
  try {
    const { withdrawId } = req.body;
    if (!withdrawId) {
      return res.status(400).json({ success: false, error: "withdrawId required" });
    }
    const withdraw = await WithdrawRequest.findById(withdrawId);
    if (!withdraw || withdraw.status !== "pending") {
      return res.status(404).json({
        success: false,
        error: "Withdraw request not found or already processed",
      });
    }

    const wallet = await Wallet.findOne({ userId: withdraw.userId });
    const user = await User.findById(withdraw.userId);

    if (wallet) {
      wallet.realUsdBalance = Number(wallet.realUsdBalance || 0) + withdraw.amount;
      wallet.usdBalance = wallet.realUsdBalance;
      wallet.lastUpdated = new Date();
      await wallet.save();
    }
    if (user) {
      user.balance = wallet ? wallet.realUsdBalance : user.balance;
      await user.save();
    }

    withdraw.status = "rejected";
    withdraw.processedAt = new Date();
    await withdraw.save();

    res.json({
      success: true,
      message: "Withdrawal request rejected and amount refunded.",
      withdraw,
      wallet,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
