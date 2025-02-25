const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({ 
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: Number },
  role: { type: String, enum: ["Owner", "Driver", "Admin", "Employe"], default: "Driver" },
  vehicleType: { type: String, enum: ["Big", "Medium", "Small"], required: false },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
