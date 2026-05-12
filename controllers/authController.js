const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const isGatewayConfigured = (gateway) => {
  if (gateway === "stripe") {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }
  if (gateway === "razorpay") {
    return Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
    );
  }
  return true;
};

const ensureWalletDocument = async (userId, userBalance) => {
  const safeBalance = Number.isFinite(userBalance) ? userBalance : 0;

  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        usdBalance: safeBalance,
        realUsdBalance: 0,
        tokenBalance: 0,
      },
      $set: {
        lastUpdated: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  let requiresSave = false;
  if (wallet.realUsdBalance === undefined || wallet.realUsdBalance === null) {
    wallet.realUsdBalance = 0;
    requiresSave = true;
  }
  if (wallet.usdBalance === undefined || wallet.usdBalance === null) {
    wallet.usdBalance = wallet.realUsdBalance;
    requiresSave = true;
  }

  if (requiresSave) {
    await wallet.save();
  }

  return wallet;
};

// Register Controller
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: "Email already registered",
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          error: "Username already taken",
        });
      }
    }

    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      balance: 0,
    });

    await user.save();
    await ensureWalletDocument(user._id, user.balance);

    const token = generateToken(user._id, user.email);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during registration",
    });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password since it's set to select: false in model
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

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

    const token = generateToken(user._id, user.email);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
};

// Get Profile Controller
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // req.user set by auth middleware
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get Profile Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Error fetching profile",
    });
  }
};

// Update Balance Controller
const updateBalance = async (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== "number") {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const wallet = await ensureWalletDocument(user._id, user.balance);
    const balanceField = "realUsdBalance";

    const currentBalance = Number(wallet[balanceField] || 0);
    if (currentBalance + amount < 0) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
      });
    }

    wallet[balanceField] = currentBalance + amount;
    wallet.usdBalance = wallet.realUsdBalance;
    wallet.lastUpdated = new Date();

    user.balance = wallet.realUsdBalance;
    await user.save();

    await wallet.save();

    res.json({
      success: true,
      message: "Balance updated",
      wallet: {
        usdBalance: Number(wallet.realUsdBalance || 0),
        realUsdBalance: Number(wallet.realUsdBalance || 0),
        tokenBalance: Number(wallet.tokenBalance || 0),
      },
      user, // update user in state
    });
  } catch (error) {
    console.error("Update Balance Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Error updating balance",
    });
  }
};

const OtpRequest = require("../models/OtpRequest");

const crypto = require("crypto");
const sendOtpToUser = async (user, otp) => {
  // TODO: Integrate with SMS/email provider
  console.log(`OTP for ${user.email || user.phone}: ${otp}`);
};

const depositByCard = async (req, res) => {
  try {
    const { amount, gateway = "stripe", otp } = req.body;

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
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
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // If OTP not provided, generate and send OTP, prompt for OTP input
    if (!otp) {
      const generatedOtp = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
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

    // OTP verification required
    const otpDoc = await OtpRequest.findOne({
      userId: req.user.id,
      type: "deposit",
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    });
    if (!otpDoc) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired OTP" });
    }
    otpDoc.verified = true;
    await otpDoc.save();

    const wallet = await ensureWalletDocument(user._id, user.balance);
    wallet.realUsdBalance = Number(wallet.realUsdBalance || 0) + amount;
    wallet.usdBalance = wallet.realUsdBalance;
    wallet.lastUpdated = new Date();
    await wallet.save();

    user.balance = wallet.realUsdBalance;
    // Add 10% bonus points per deposit
    const bonus = Math.floor(amount * 0.1);
    user.bonusPoints = (user.bonusPoints || 0) + bonus;
    await user.save();

    return res.json({
      success: true,
      message: `$${amount.toFixed(2)} added to real account (+${bonus} bonus points)`,
      gateway,
      wallet: {
        usdBalance: Number(wallet.realUsdBalance || 0),
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

module.exports = {
  register,
  login,
  getProfile,
  updateBalance,
  depositByCard,
};
