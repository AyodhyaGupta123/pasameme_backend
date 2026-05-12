// Trade microservice logic (example)
// In a real microservices setup, this would be a separate repo/app with its own server

const Position = require("../models/Position");

const getUserPositions = async (userId) => {
  return await Position.find({ user: userId });
};

const createTrade = async (tradeData) => {
  const position = new Position(tradeData);
  return await position.save();
};

module.exports = {
  getUserPositions,
  createTrade,
};
