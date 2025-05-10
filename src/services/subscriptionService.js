const mongoose = require('mongoose');
const Subscription = require("../models/subscriptionModel");

const SUBSCRIPTION_FEATURES = {
  Free: {
    maxReservationHours: 2,
    maxActiveReservations: 1,
    cancellationHours: 0,
    priceDiscount: 0,
    hasAds: true,
    carWashPerMonth: 0,
    supportPriority: "standard"
  },
  Standard: {
    maxReservationHours: 12,
    maxActiveReservations: 3,
    cancellationHours: 2,
    priceDiscount: 5,
    hasAds: false,
    carWashPerMonth: 1,
    supportPriority: "priority"
  },
  Premium: {
    maxReservationHours: 24,
    maxActiveReservations: 999, // illimité
    cancellationHours: 0.5, // 30 minutes
    priceDiscount: 15,
    hasAds: false,
    carWashPerMonth: 2,
    supportPriority: "vip"
  }
};

// Créer un nouvel abonnement
const createSubscription = async (req, res) => {
  try {
    const { userId, plan } = req.body;
    
    // Vérifier s'il existe déjà un abonnement actif
    const existingSubscription = await Subscription.findOne({
      userId,
      status: "Active",
      endDate: { $gt: new Date() }
    });

    if (existingSubscription) {
      return res.status(400).json({ 
        message: "User already has an active subscription" 
      });
    }

    // Définir la durée de l'abonnement (1 mois pour les plans payants)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Créer le nouvel abonnement avec les caractéristiques du plan
    const subscription = new Subscription({
      ...req.body,
      features: SUBSCRIPTION_FEATURES[plan],
      startDate,
      endDate
    });

    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Récupérer l'abonnement actif d'un utilisateur
const getActiveSubscription = async (userId) => {
  try {
    return await mongoose.model('Subscription').findOne({
      userId,
      status: 'Active',
      endDate: { $gt: new Date() },
      paymentStatus: 'completed'
    });
  } catch (error) {
    throw new Error(`Failed to get active subscription: ${error.message}`);
  }
};

// Vérifier les limitations de l'abonnement
const checkSubscriptionLimits = async (userId, checkType, value) => {
  try {
    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
      throw new Error("No active subscription found");
    }

    switch (checkType) {
      case "reservationHours":
        return value <= subscription.features.maxReservationHours;
      case "activeReservations":
        return value <= subscription.features.maxActiveReservations;
      case "cancellation":
        return value <= subscription.features.cancellationHours;
      default:
        return false;
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

// Créer un abonnement gratuit par défaut pour un nouvel utilisateur
const createDefaultSubscription = async (userId) => {
  try {
    return await Subscription.createDefaultSubscription(userId);
  } catch (error) {
    throw new Error(`Failed to create default subscription: ${error.message}`);
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

// Mettre à jour un abonnement
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Si le plan change, mettre à jour les caractéristiques
    if (updates.plan) {
      updates.features = SUBSCRIPTION_FEATURES[updates.plan];
    }

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.status(200).json(subscription);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
  deleteCanceledSubscriptionsByUserId,
  getActiveSubscriptionStatus,
  createDefaultSubscription,
  checkSubscriptionLimits,
  getActiveSubscription
};
