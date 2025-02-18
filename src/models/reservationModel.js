const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  reservationId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, ref: "User" },
  matricule: { type: String, required: true },
  spotId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ["Confirmed", "Cancelled"], default: "Confirmed" },
}, { timestamps: true });

module.exports = mongoose.model("Reservation", reservationSchema);