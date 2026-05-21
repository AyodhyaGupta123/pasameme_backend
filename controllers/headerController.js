const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Notification = require("../models/Notification");

/**
 * Helper function: safely extract user ID
 * Prevents crashes when req.user is undefined
 */
const getSafeUserId = (req) => {
  if (!req.user) return null;
  return req.user._id || req.user.id;
};

const ensureWalletState = async (userId, userBalance) => {
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        usdBalance: userBalance,
        realUsdBalance: userBalance,
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
    wallet.realUsdBalance = Number(wallet.usdBalance ?? userBalance);
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

// 1. Header Data (User, Wallet, Notifications)
exports.getHeaderData = async (req, res) => {
  try {
    const userId = getSafeUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    // Parallel calls for better performance
    const [user, notifications] = await Promise.all([
      User.findById(userId).select("name email avatarUrl balance"),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(10),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const wallet = await ensureWalletState(
      userId,
      Number(user.balance),
    );

    const walletData = {
      usdBalance: parseFloat(wallet?.realUsdBalance ?? user?.balance ?? 0),
      realUsdBalance: parseFloat(wallet?.realUsdBalance ?? user?.balance ?? 0),
      tokenBalance: parseFloat(wallet?.tokenBalance || 0),
    };

    const formattedNotifications = notifications.map((notif) => ({
      id: notif._id,
      message: notif.message,
      read: notif.read,
      type: notif.type,
      timestamp: new Date(notif.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      wallet: walletData,
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error("Error fetching header data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Get Wallet Specific Data
exports.getWallet = async (req, res) => {
  try {
    const userId = getSafeUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized access" });
    }

    const [user] = await Promise.all([User.findById(userId).select("balance")]);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const wallet = await ensureWalletState(
      userId,
      Number(user.balance),
    );

    res.json({
      success: true,
      wallet: {
        usdBalance: parseFloat(wallet?.realUsdBalance ?? user?.balance ?? 0),
        realUsdBalance: parseFloat(
          wallet?.realUsdBalance ?? user?.balance ?? 0,
        ),
        tokenBalance: parseFloat(wallet?.tokenBalance || 0),
        lastUpdated: wallet?.updatedAt || new Date(),
      },
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Get Referral Data
exports.getReferralData = async (req, res) => {
  try {
    const userId = getSafeUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized access" });
    }

    const user = await User.findById(userId).select(
      "referralCode referrals referralEarnings"
    );

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Generate referral code if it doesn't exist
    if (!user.referralCode) {
      user.referralCode = "PASA" + userId.toString().slice(-6).toUpperCase();
      await user.save();
    }

    // Count total referrals from the referrals array
    const totalReferrals = user.referrals ? user.referrals.length : 0;
    const referralEarnings = user.referralEarnings || 0;

    res.json({
      success: true,
      referralCode: user.referralCode,
      totalReferrals,
      referralEarnings,
    });
  } catch (error) {
    console.error("Error fetching referral data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Apply Referral Code (When new user signs up with referral)
exports.applyReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = getSafeUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized access" });
    }

    if (!referralCode || referralCode.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Referral code is required" });
    }

    // Find the referrer by their referral code
    const referrer = await User.findOne({
      referralCode: referralCode.trim().toUpperCase(),
    });

    if (!referrer) {
      return res
        .status(404)
        .json({ success: false, error: "Invalid referral code" });
    }

    if (referrer._id.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        error: "You cannot use your own referral code",
      });
    }

    // Get the current user to check if they already have a referrer
    const currentUser = await User.findById(userId);
    if (currentUser.referredBy) {
      return res.status(400).json({
        success: false,
        error: "You have already used a referral code",
      });
    }

    // Add user to referrer's referrals array
    if (!referrer.referrals) {
      referrer.referrals = [];
    }
    referrer.referrals.push(userId);
    await referrer.save();

    // Set the referrer for the current user
    currentUser.referredBy = referrer._id;
    await currentUser.save();

    // Create notification for referrer
    await Notification.create({
      userId: referrer._id,
      message: `New referral: ${currentUser.name || "User"} joined using your code!`,
      type: "referral",
      read: false,
    });

    res.json({
      success: true,
      message: "Referral code applied successfully",
      referrerName: referrer.name,
    });
  } catch (error) {
    console.error("Error applying referral code:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Add Referral Earnings (When referral makes first deposit - called from deposit handler)
exports.addReferralEarnings = async (userId, depositAmount) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.referredBy) return;

    const referrer = await User.findById(user.referredBy);
    if (!referrer) return;

    // Calculate 10% commission
    const commission = (depositAmount * 10) / 100;

    // Update referrer's earnings and wallet
    referrer.referralEarnings = (referrer.referralEarnings || 0) + commission;
    await referrer.save();

    // Update referrer's wallet
    const wallet = await Wallet.findOneAndUpdate(
      { userId: referrer._id },
      {
        $inc: { realUsdBalance: commission },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true, new: true },
    );

    // Create notification for referrer
    await Notification.create({
      userId: referrer._id,
      message: `Referral bonus: +$${commission.toFixed(2)} (10% from ${user.name || "user"}'s deposit)`,
      type: "referral_earnings",
      read: false,
    });

    console.log(
      `Referral earnings added: ${commission} to ${referrer.email}`
    );
    return commission;
  } catch (error) {
    console.error("Error adding referral earnings:", error);
    return 0;
  }
};

// 6. Mark Single Notification as Read
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getSafeUserId(req);

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      notification: { id: notification._id, read: notification.read },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 7. Mark All Notifications as Read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = getSafeUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true },
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 8. Delete Single Notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getSafeUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 9. Clear All Notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = getSafeUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await Notification.deleteMany({ userId });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};