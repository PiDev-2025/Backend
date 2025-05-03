const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "EUR",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["card", "cash"],
    },
    paymentDetails: {
      cardNumber: String,
      cardHolder: String,
      expirationDate: String,
      cvv: String,
    },
    transactionId: String,
    paidAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
