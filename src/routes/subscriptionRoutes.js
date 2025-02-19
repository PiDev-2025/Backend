const express = require("express");
const router = express.Router();
const {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription
} = require("../services/subscriptionService");

router.post("/subscriptions", createSubscription);
router.get("/subscriptions", getSubscriptions);
router.get("/subscriptions/:id", getSubscriptionById);
router.put("/subscriptions/:id", updateSubscription);
router.delete("/subscriptions/:id", deleteSubscription);

module.exports = router;