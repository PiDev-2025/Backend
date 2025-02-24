const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({ 
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: Number },
  role: { type: String, enum: ["Owner", "Driver", "Admin", "Employe"]},
  vehicleType: {
    type: String,
    enum: ['Big', 'Medium', 'Small'],
    required: false,
    default: undefined // Or a specific default value if you prefer
},
  otp: { type: String, required: false },
  otpExpires: { type: Date, required: false },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);