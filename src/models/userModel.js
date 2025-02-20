const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: Number, required: true },
  role: { type: String, enum: ["Owner", "Driver", "Admin", "Employe"], default: "Driver" },
  vehicleType: { type: String, enum: ["Big", "Medium", "Small"], required: false },

  otp: { type: String, required: false }, // Stockage du code OTP temporaire
  otpExpires: { type: Date, required: false }, // Expiration de l'OTP

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
