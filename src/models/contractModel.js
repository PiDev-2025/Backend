const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema({
  contractId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, ref: "User" },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  contractType: { type: String, required: true },
  termsAndConditions: { type: String, required: true },
  status: { type: String, enum: ["Active", "Terminated"], default: "Active" },
}, { timestamps: true });

module.exports = mongoose.model("Contract", contractSchema);