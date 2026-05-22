const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const { authMiddleware } = require("../middlewares//auth");

router.get("/my", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

module.exports = router;