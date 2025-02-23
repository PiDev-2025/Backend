const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({ 
  _id: { type: String, required: true }, // Change _id to String to match Google profile ID
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: Number },
  role: { type: String, enum: ["Owner", "Driver", "Admin", "Employe"], default: "Driver" },
  vehicleType: { type: String, enum: ["Big", "Medium", "Small"], required: false },
  otp: { type: String, required: false },
  otpExpires: { type: Date, required: false },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);