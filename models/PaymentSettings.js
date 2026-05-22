const mongoose = require("mongoose");

const paymentSettingsSchema = new mongoose.Schema(
  {
    upiId: {
      type: String,
      required: true,
      default: "8175847774@okbizaxis",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "PaymentSettings",
  paymentSettingsSchema
);