const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
  claimId: { type: String, required: true, unique: true },
  reservationId: { type: String, required: true, ref: "Reservation" },
  userId: { type: String, required: true, ref: "User" },
  description: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Resolved"], default: "Pending" },
}, { timestamps: true });

module.exports = mongoose.model("Claim", claimSchema);