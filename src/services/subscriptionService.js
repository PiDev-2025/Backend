const Subscription = require("../models/subscriptionModel");

// services/subscriptionService.js
async function getSubscriptionsByUserId(userId) {
  try {
    const subscriptions = await Subscription.find({ userId }).populate(
      "parkingId"
    );
    return subscriptions;
  } catch (error) {
    throw new Error(error.message);
  }
}

// Create a new subscription
const createSubscription = async (req, res) => {
  try {
    const subscription = new Subscription(req.body);
    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all subscriptions
const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single subscription by ID
const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a subscription
const updateSubscription = async (req, res) => {
  try {
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return updated document
        runValidators: true, // Ensure validation
      }
    );

    if (!updatedSubscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.status(200).json(updatedSubscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a subscription
const deleteSubscription = async (req, res) => {
  try {
    const deletedSubscription = await Subscription.findByIdAndDelete(
      req.params.id
    );
    if (!deletedSubscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.status(200).json({ message: "Subscription deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all canceled subscriptions for a user
const deleteCanceledSubscriptionsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await Subscription.deleteMany({
      userId: userId,
      status: "Cancelled",
    });

    res.status(200).json({
      message: `Deleted ${result.deletedCount} canceled subscriptions`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get active subscription status for a user
const getActiveSubscriptionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const activeSubscription = await Subscription.findOne({
      userId: userId,
      status: "Active",
      endDate: { $gt: new Date() }, // Check if subscription hasn't expired
    });

    res.status(200).json({
      hasActiveSubscription: !!activeSubscription,
      subscription: activeSubscription,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsByUserId,
  deleteCanceledSubscriptionsByUserId,
  getActiveSubscriptionStatus,
};
