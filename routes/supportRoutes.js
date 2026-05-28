const express = require("express");
const router = express.Router();

const {
  sendUserMessage,
  getMyMessages,
  getAllSupportChats,
  sendAdminReply,
} = require("../controllers/supportController");

const { authMiddleware } = require("../middlewares/auth");

router.post("/message", authMiddleware, sendUserMessage);
router.get("/my", authMiddleware, getMyMessages);

router.get("/admin/chats", authMiddleware, getAllSupportChats);
router.post("/admin/reply/:userId", authMiddleware, sendAdminReply);

module.exports = router;