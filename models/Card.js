const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cardId: { type: String, required: true }, // tokenized/encrypted id
  last4: { type: String, required: true },
  expiry: { type: String, required: true },
  holderName: { type: String, required: true },
  brand: { type: String },
  encryptedCardNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Card", CardSchema);
