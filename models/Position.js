import mongoose from "mongoose";

const positionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  symbol: String,
  side: String, 
  type: String,
  price: Number,
  size: Number,
  leverage: Number,
  status: {
    type: String,
    default: "OPEN"
  }
}, { timestamps: true });

export default mongoose.model("Position", positionSchema);
