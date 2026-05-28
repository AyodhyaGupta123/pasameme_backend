const SupportMessage = require("../models/SupportMessage");

exports.sendUserMessage = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const support = await SupportMessage.create({
      userId,
      sender: "user",
      message: message.trim(),
      isReadByAdmin: false,
      isReadByUser: true,
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      support,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyMessages = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const messages = await SupportMessage.find({ userId }).sort({
      createdAt: 1,
    });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSupportChats = async (req, res) => {
  try {
    const chats = await SupportMessage.find()
      .populate("userId", "name username email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      chats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendAdminReply = async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const reply = await SupportMessage.create({
      userId,
      sender: "admin",
      message: message.trim(),
      isReadByAdmin: true,
      isReadByUser: false,
    });

    res.status(201).json({
      success: true,
      message: "Reply sent successfully",
      reply,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};