const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  subscriptionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, ref: "User" },
  parkingId: { type: String, required: true, ref: "Parking" },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ["Active", "Cancelled"], default: "Active" },
  price: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Subscription", subscriptionSchema);