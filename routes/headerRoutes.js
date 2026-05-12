const express = require('express');
const router = express.Router();
const {
  getHeaderData,
  markRead,
  markAllAsRead,
  getWallet,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/headerController');

const { authMiddleware } = require('../middlewares/auth');

router.get('/info', authMiddleware, getHeaderData);

router.get('/wallet', authMiddleware, getWallet);

router.put('/notification/:id', markRead);

router.put('/notifications/read-all', markAllAsRead);

router.delete('/notification/:id', deleteNotification);

router.delete('/notifications', clearAllNotifications);

module.exports = router;