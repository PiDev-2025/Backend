const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
  claimId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  imageUrl: { type: String, required: true },
  description: { type: String, required: true },
  plateNumber: { type: String },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation" },
  status: { 
    type: String, 
    enum: ["pending", "in_progress", "resolved", "rejected"], 
    default: "pending",
    lowercase: true
  },
}, { timestamps: true });

module.exports = mongoose.model("Claim", claimSchema);