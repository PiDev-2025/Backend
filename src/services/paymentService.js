const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Reservation = require("../models/reservationModel");
const Subscription = require("../models/subscriptionModel");
const axios = require("axios");

const createPaymentIntent = async (reservationId) => {
  try {
    const reservation = await Reservation.findById(reservationId);
    console.log("Reservation found:", reservation);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Convert price to cents for Stripe
    const amount = Math.round(reservation.totalPrice * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "eur",
      metadata: {
        reservationId: reservationId,
        parkingId: reservation.parkingId.toString(),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      amount: amount,
    };
  } catch (error) {
    console.error("Payment intent creation error:", error);
    throw error;
  }
};

const confirmPayment = async (reservationId, paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("Payment Intent Status:", paymentIntent.status);
    console.log("Payment Intent Details:", paymentIntent);

    if (paymentIntent.status === "succeeded") {
      await Reservation.findByIdAndUpdate(reservationId, {
        status: "accepted",
        paymentStatus: "completed",
      });
      return { success: true };
    } else {
      throw new Error(
        `Payment not successful. Status: ${paymentIntent.status}`
      );
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);
    throw error;
  }
};

const createSubscriptionPaymentIntent = async (subscriptionId) => {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Convert price to cents for Stripe
    const amount = Math.round(subscription.price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "eur",
      metadata: {
        subscriptionId: subscriptionId,
        userId: subscription.userId.toString(),
        parkingId: subscription.parkingId.toString(),
        type: "subscription",
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      amount: amount,
    };
  } catch (error) {
    console.error("Subscription payment intent creation error:", error);
    throw error;
  }
};

const confirmSubscriptionPayment = async (subscriptionId, paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("Subscription Payment Intent Status:", paymentIntent.status);

    if (paymentIntent.status === "succeeded") {
      await Subscription.findByIdAndUpdate(subscriptionId, {
        status: "Active",
      });
      return { success: true };
    } else {
      throw new Error(
        `Subscription payment not successful. Status: ${paymentIntent.status}`
      );
    }
  } catch (error) {
    console.error("Subscription payment confirmation error:", error);
    throw error;
  }
};

async function generatePayment(amount, trackingId) {
  const url = "https://developers.flouci.com/api/generate_payment";

  const payload = {
    app_token: "628b2944-79ad-4ca2-b92d-cf92026f2bd9",
    app_secret: process.env.FLOUCI_SECRET,
    amount: amount,
    accept_card: "true",
    session_timeout_secs: 1200,
    success_link: "http://localhost:3000/booking",
    fail_link: "http://localhost:3001/fail",
    developer_tracking_id: trackingId,
  };

  try {
    const result = await axios.post(url, payload);
    return result.data;
  } catch (error) {
    console.error("Payment generation error:", error.message);
    throw error;
  }
}
const Verify = async (req, res) => {
  const payment_id = req.params.id;

  await axios
    .get(`https://developers.flouci.com/api/verify_payment/${payment_id}`, {
      headers: {
        "Content-Type": "application/json",
        apppublic: "628b2944-79ad-4ca2-b92d-cf92026f2bd9",
        appsecret: process.env.FLOUCI_SECRET,
      },
    })
    .then((result) => {
      res.send(result.data);
    })
    .catch((err) => {
      console.log(err.message);
      res
        .status(500)
        .send({ error: "Erreur lors de la vérification du paiement" });
    });
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  generatePayment,
  Verify,
  createSubscriptionPaymentIntent,
  confirmSubscriptionPayment,
};