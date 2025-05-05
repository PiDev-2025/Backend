const express = require("express");
const router = express.Router();
const subscriptionService = require("../services/subscriptionService");

const {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  deleteCanceledSubscriptionsByUserId,
  getActiveSubscriptionStatus,
} = require("../services/subscriptionService");

router.post("/subscriptions", createSubscription);
router.get("/subscriptions", getSubscriptions);
router.get("/subscriptions/:id", getSubscriptionById);
router.put("/subscriptions/:id", updateSubscription);
router.delete("/subscriptions/:id", deleteSubscription);

// GET /subscriptions/user/:userId
router.get("/subscriptions/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const subscriptions = await subscriptionService.getSubscriptionsByUserId(
      userId
    );
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /subscriptions/user/:userId/canceled
router.delete(
  "/subscriptions/user/:userId/canceled",
  deleteCanceledSubscriptionsByUserId
);

// GET /subscriptions/user/:userId/status - get active subscription status
router.get("/subscriptions/user/:userId/status", getActiveSubscriptionStatus);

module.exports = router;
