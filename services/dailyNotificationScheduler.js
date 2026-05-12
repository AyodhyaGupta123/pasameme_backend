// Schedules daily notifications at 18:00 (6 PM)
const cron = require("node-cron");
const { createNotification } = require("./notificationService");
const User = require("../models/User");

// Schedule: Every day at 18:00
cron.schedule("0 18 * * *", async () => {
  try {
    const users = await User.find({});
    for (const user of users) {
      await createNotification({
        userId: user._id,
        title: "Daily Reminder",
        message: "This is your daily notification!",
        createdAt: new Date(),
      });
    }
    console.log("Daily notifications sent at 18:00");
  } catch (err) {
    console.error("Error sending daily notifications:", err);
  }
});

module.exports = {};
