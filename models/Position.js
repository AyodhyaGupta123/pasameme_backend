const mongoose = require("mongoose");

const positionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    symbol: {
      type: String,
      required: true,
    },

    side: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      default: "MARKET",
    },

    price: {
      type: Number,
      default: 0,
    },

    size: {
      type: Number,
      default: 0,
    },

    leverage: {
      type: Number,
      default: 1,
    },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
    },
  },
  {
    timestamps: true,
  }
);

const Position = mongoose.model("Position", positionSchema);

module.exports = Position;