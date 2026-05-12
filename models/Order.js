const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: String,
  symbol: String,
  targetPrice: Number,
  side: String,
  scheduleMinutes: Number,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
  executedAt: Date,
});

const OrderModel = mongoose.model("Order", OrderSchema);

class Order {
  static async create({ userId, symbol, targetPrice, side, scheduleMinutes }) {
    return OrderModel.create({
      userId,
      symbol,
      targetPrice,
      side,
      scheduleMinutes,
      status: "pending",
      createdAt: new Date(),
    });
  }

  static async getPending() {
    return OrderModel.find({ status: "pending" });
  }

  static async updateStatus(orderId, status) {
    return OrderModel.findByIdAndUpdate(
      orderId,
      { status, executedAt: new Date() },
      { new: true },
    );
  }
}

module.exports = Order;
