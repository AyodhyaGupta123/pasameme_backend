const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const DepositRequest = require("../models/DepositRequest");
const OtpRequest = require("../models/OtpRequest");

const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const ensureWalletDocument = async (userId, userBalance = 0) => {
  const safeBalance = Number.isFinite(Number(userBalance))
    ? Number(userBalance)
    : 0;

  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        usdBalance: safeBalance,
        realUsdBalance: safeBalance,
        tokenBalance: 0,
      },
      $set: {
        lastUpdated: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  let changed = false;

  if (wallet.realUsdBalance === undefined || wallet.realUsdBalance === null) {
    wallet.realUsdBalance = safeBalance;
    changed = true;
  }

  if (wallet.usdBalance === undefined || wallet.usdBalance === null) {
    wallet.usdBalance = wallet.realUsdBalance;
    changed = true;
  }

  if (wallet.tokenBalance === undefined || wallet.tokenBalance === null) {
    wallet.tokenBalance = 0;
    changed = true;
  }

  if (changed) {
    wallet.lastUpdated = new Date();
    await wallet.save();
  }

  return wallet;
};

const register = async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Username, email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error:
          existingUser.email === normalizedEmail
            ? "Email already registered"
            : "Username already taken",
      });
    }

    let referredByUser = null;

    if (referralCode) {
      referredByUser = await User.findOne({
        referralCode: referralCode.toUpperCase(),
      });
    }

    const user = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      balance: 0,
      referredBy: referredByUser?._id || null,
    });

    await user.save();

    if (referredByUser) {
      referredByUser.totalReferrals = (referredByUser.totalReferrals || 0) + 1;
      await referredByUser.save();
    }

    const wallet = await ensureWalletDocument(user._id, user.balance);
    const token = generateToken(user._id, user.email);

    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        ...userData,
        wallet,
      },
    });
  } catch (error) {
    console.error("Register Error:", error.message);

    res.status(500).json({
      success: false,
      error: "Server error during registration",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const wallet = await ensureWalletDocument(user._id, user.balance);
    const token = generateToken(user._id, user.email);

    const userData = user.toObject();
    delete userData.password;

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        ...userData,
        wallet,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);

    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const wallet = await ensureWalletDocument(user._id, user.balance);

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        wallet,
      },
    });
  } catch (error) {
    console.error("Get Profile Error:", error.message);

    res.status(500).json({
      success: false,
      error: "Error fetching profile",
    });
  }
};

const updateBalance = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount)) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const wallet = await ensureWalletDocument(user._id, user.balance);
    const currentBalance = Number(wallet.realUsdBalance || 0);

    if (currentBalance + amount < 0) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
      });
    }

    wallet.realUsdBalance = currentBalance + amount;
    wallet.usdBalance = wallet.realUsdBalance;
    wallet.lastUpdated = new Date();

    user.balance = wallet.realUsdBalance;

    await wallet.save();
    await user.save();

    res.json({
      success: true,
      message: "Balance updated",
      wallet: {
        usdBalance: Number(wallet.usdBalance || 0),
        realUsdBalance: Number(wallet.realUsdBalance || 0),
        tokenBalance: Number(wallet.tokenBalance || 0),
      },
      user,
    });
  } catch (error) {
    console.error("Update Balance Error:", error.message);

    res.status(500).json({
      success: false,
      error: "Error updating balance",
    });
  }
};

const sendOtpToUser = async (user, otp) => {
  console.log(`OTP for ${user.email || user.phone}: ${otp}`);
};

const isGatewayConfigured = (gateway) => {
  if (gateway === "stripe") {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  if (gateway === "razorpay") {
    return Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    );
  }

  return true;
};

const depositByCard = async (req, res) => {
  try {
    const { gateway = "stripe", otp } = req.body;
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid deposit amount",
      });
    }

    if (!gateway || gateway !== "stripe") {
      return res.status(400).json({
        success: false,
        error: "Unsupported payment gateway",
      });
    }

    if (!isGatewayConfigured(gateway)) {
      return res.status(400).json({
        success: false,
        error: `${gateway} is not configured on server`,
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (!otp) {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await OtpRequest.create({
        userId: req.user.id,
        type: "deposit",
        otp: generatedOtp,
        expiresAt,
      });

      await sendOtpToUser(user, generatedOtp);

      return res.status(200).json({
        success: false,
        error: "OTP_SENT",
        message: "OTP sent to your registered mobile/email.",
      });
    }

    const otpDoc = await OtpRequest.findOne({
      userId: req.user.id,
      type: "deposit",
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    otpDoc.verified = true;
    await otpDoc.save();

    const wallet = await ensureWalletDocument(user._id, user.balance);

    wallet.realUsdBalance = Number(wallet.realUsdBalance || 0) + amount;
    wallet.usdBalance = wallet.realUsdBalance;
    wallet.lastUpdated = new Date();

    user.balance = wallet.realUsdBalance;
    user.bonusPoints = (user.bonusPoints || 0) + Math.floor(amount * 0.1);

    await wallet.save();
    await user.save();

    return res.json({
      success: true,
      message: `$${amount.toFixed(2)} added to real account`,
      gateway,
      wallet: {
        usdBalance: Number(wallet.usdBalance || 0),
        realUsdBalance: Number(wallet.realUsdBalance || 0),
        tokenBalance: Number(wallet.tokenBalance || 0),
      },
      bonusPoints: user.bonusPoints,
    });
  } catch (error) {
    console.error("Card Deposit Error:", error.message);

    res.status(500).json({
      success: false,
      error: "Error processing card deposit",
    });
  }
};

const requestDeposit = async (req, res) => {
  try {
    const { transactionId, method = "manual_bank_upi" } = req.body;
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    if (!transactionId || String(transactionId).trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: "Transaction reference is required",
      });
    }

    const deposit = await DepositRequest.create({
      userId: req.user.id,
      amount,
      transactionId: String(transactionId).trim(),
      method,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Deposit request submitted successfully. Admin review is required.",
      deposit,
    });
  } catch (error) {
    console.error("Deposit Request Error:", error.message);

    res.status(500).json({
      success: false,
      error: "Error submitting deposit request",
    });
  }
};

const getReferralData = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const referralCode = `PASA${String(userId).slice(-6).toUpperCase()}`;

    return res.status(200).json({
      success: true,
      referralCode,
      totalReferrals: 0,
      referralEarnings: 0,
    });
  } catch (error) {
    console.error("Referral Data Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch referral data",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateBalance,
  depositByCard,
  requestDeposit,
  getReferralData,
};