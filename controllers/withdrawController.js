const WithdrawRequest = require("../models/WithdrawRequest");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const OtpRequest = require("../models/OtpRequest");

function isSevenDaysPassed(date) {
  if (!date) return true;

  const lastDate = new Date(date);

  if (Number.isNaN(lastDate.getTime())) return true;

  const now = new Date();
  const diff = now - lastDate;

  return diff >= 7 * 24 * 60 * 60 * 1000;
}

exports.requestWithdraw = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.body.userId;
    const { amount, otp, method, upiId, bankName, accountNumber, ifscCode } =
      req.body;

    const withdrawAmount = Number(amount);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal amount",
      });
    }

    if (otp) {
      const otpDoc = await OtpRequest.findOne({
        userId,
        type: "withdraw",
        otp,
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (!otpDoc) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      otpDoc.verified = true;
      await otpDoc.save();
    }

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const currentBalance = Number(
      wallet.realUsdBalance ?? wallet.usdBalance ?? 0
    );

    if (currentBalance < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    const lastDepositDate = wallet.lastDepositAt || wallet.createdAt;

    if (!isSevenDaysPassed(lastDepositDate)) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal allowed only after 7 days from last deposit.",
      });
    }

    const withdraw = await WithdrawRequest.create({
      userId,
      amount: withdrawAmount,
      status: "pending",
      method: method || "manual",
      upiId: upiId || "",
      bankName: bankName || "",
      accountNumber: accountNumber || "",
      ifscCode: ifscCode || "",
      message: `User requested withdrawal of $${withdrawAmount}`,
      requestedAt: new Date(),
    });

    wallet.realUsdBalance = currentBalance - withdrawAmount;
    wallet.usdBalance = wallet.realUsdBalance;
    wallet.lockedBalance = Number(wallet.lockedBalance || 0) + withdrawAmount;
    wallet.lastWithdrawAt = new Date();
    wallet.lastUpdated = new Date();

    await wallet.save();

    const user = await User.findById(userId);

    if (user) {
      user.balance = wallet.realUsdBalance;
      await user.save();
    }

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted. Await admin approval.",
      withdraw,
      wallet: {
        usdBalance: wallet.usdBalance,
        realUsdBalance: wallet.realUsdBalance,
        lockedBalance: wallet.lockedBalance,
        tokenBalance: wallet.tokenBalance || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getWithdrawRequests = async (req, res) => {
  try {
    const withdrawRequests = await WithdrawRequest.find()
      .populate("userId", "name username email mobile")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      withdrawRequests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateWithdrawStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal status",
      });
    }

    const withdraw = await WithdrawRequest.findById(id);

    if (!withdraw) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    if (withdraw.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Withdrawal request already processed",
      });
    }

    const wallet = await Wallet.findOne({ userId: withdraw.userId });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const amount = Number(withdraw.amount || 0);

    if (status === "approved") {
      wallet.lockedBalance = Math.max(
        0,
        Number(wallet.lockedBalance || 0) - amount
      );
      wallet.totalWithdrawals = Number(wallet.totalWithdrawals || 0) + amount;
    }

    if (status === "rejected") {
      wallet.lockedBalance = Math.max(
        0,
        Number(wallet.lockedBalance || 0) - amount
      );
      wallet.realUsdBalance = Number(wallet.realUsdBalance || 0) + amount;
      wallet.usdBalance = wallet.realUsdBalance;
    }

    wallet.lastUpdated = new Date();
    await wallet.save();

    const user = await User.findById(withdraw.userId);

    if (user) {
      user.balance = wallet.realUsdBalance;
      await user.save();
    }

    withdraw.status = status;
    withdraw.adminNote = adminNote || "";
    withdraw.processedAt = new Date();

    await withdraw.save();

    return res.status(200).json({
      success: true,
      message: `Withdrawal request ${status} successfully`,
      withdraw,
      wallet: {
        usdBalance: wallet.usdBalance,
        realUsdBalance: wallet.realUsdBalance,
        lockedBalance: wallet.lockedBalance,
        tokenBalance: wallet.tokenBalance || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};