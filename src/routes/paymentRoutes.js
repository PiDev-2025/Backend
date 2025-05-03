const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");

const {
  createPaymentIntent,
  confirmPayment,
  generatePayment,
  Verify,
} = require("../services/paymentService");
//flouci payment
router.post('/flouci/paiement', async (req, res) => {
  try {
    const result = await generatePayment(req.body.amount, "14670dfe-8ee8-4692-9308-b99fdf9def3d");
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: "Payment failed" });
  }
});
router.get('/verify/:id', Verify);
// Create payment intent
router.post("/create-payment-intent", verifyToken, async (req, res) => {
  try {
    const { reservationId } = req.body;
    const paymentIntent = await createPaymentIntent(reservationId);
    res.json(paymentIntent);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

// Confirm payment
router.post("/confirm-payment", verifyToken, async (req, res) => {
  try {
    const { reservationId, paymentIntentId } = req.body;
    const result = await confirmPayment(reservationId, paymentIntentId);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
