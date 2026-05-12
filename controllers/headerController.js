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

// 3. Mark Single Notification as Read
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

// 4. Mark All Notifications as Read
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

// 5. Delete Single Notification
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

// 6. Clear All Notifications
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
