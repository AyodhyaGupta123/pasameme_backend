// User microservice logic (example)
// In a real microservices setup, this would be a separate repo/app with its own server

const User = require("../models/User");

const getUserById = async (userId) => {
  return await User.findById(userId);
};

const createUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

module.exports = {
  getUserById,
  createUser,
};
