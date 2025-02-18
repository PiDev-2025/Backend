const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: Number, required: true },
  vehicleType: { type: String, required: true },
  role: { type: String, enum: ["Admin", "User"], default: "User" },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);