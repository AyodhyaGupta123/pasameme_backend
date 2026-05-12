// Notification microservice logic (example)
// In a real microservices setup, this would be a separate repo/app with its own server

const Notification = require("../models/Notification");

const getUserNotifications = async (userId) => {
  return await Notification.find({ user: userId });
};

const createNotification = async (notificationData) => {
  const notification = new Notification(notificationData);
  return await notification.save();
};

module.exports = {
  getUserNotifications,
  createNotification,
};
