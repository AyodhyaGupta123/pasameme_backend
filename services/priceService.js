// Price microservice logic (example)
// In a real microservices setup, this would be a separate repo/app with its own server

const Price = require("../models/priceModel");

const getLatestPrice = async (symbol) => {
  return await Price.findOne({ symbol }).sort({ timestamp: -1 });
};

const savePrice = async (priceData) => {
  const price = new Price(priceData);
  return await price.save();
};

module.exports = {
  getLatestPrice,
  savePrice,
};
