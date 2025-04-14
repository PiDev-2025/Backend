const mongoose = require("mongoose");
const ParkingRequest = require("../models/parkingRequestModel");
const Parking = require("../models/parkingModel");
const fs = require("fs");
const path = require("path");

const getParkingsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate employeeId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "ID d'employé invalide." });
    }

    // Use id_employee field to match the schema
    const parkings = await Parking.find({
      id_employee: employeeId,
    }).populate("Owner", "name email");

    if (!parkings || parkings.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun parking trouvé pour cet employé." });
    }

    return res.status(200).json(parkings);
  } catch (error) {
    console.error("Erreur lors de la récupération des parkings:", error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
};
const updateTotalSpots = async (req, res) => {
  try {
    const { id } = req.params;
    const { change } = req.body; // change can be positive or negative

    if (isNaN(change)) {
      return res.status(400).json({ message: "Invalid change value." });
    }

    // Find the parking request
    const parking = await Parking.findById(id);
    if (!parking) {
      return res.status(404).json({ message: "Parking request not found" });
    }

    // Calculate new available spots
    const newAvailableSpots = parking.availableSpots + parseInt(change);

    // Ensure availableSpots stays within valid range
    if (newAvailableSpots < 0) {
      return res
        .status(400)
        .json({ message: "Available spots cannot be less than 0." });
    }

    if (newAvailableSpots > parking.totalSpots) {
      return res
        .status(400)
        .json({ message: "Available spots cannot exceed total spots." });
    }

    // Update available spots
    parking.availableSpots = newAvailableSpots;
    await parking.save();

    return res
      .status(200)
      .json({ message: "Available spots updated successfully", parking });
  } catch (error) {
    console.error("Error updating available spots:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createParking = async (req, res) => {
  try {
    // Log the user role
    console.log("Utilisateur connecté:", req.user);
    if (!req.user || !["Admin", "Owner"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Accès refusé, rôle non autorisé" });
    }

    const {
      name,
      description,
      position,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      features,
    } = req.body;

    // Vérification des champs requis
    if (
      !name ||
      !position ||
      !totalSpots ||
      !availableSpots ||
      !pricing ||
      !vehicleTypes
    ) {
      return res
        .status(400)
        .json({ message: "Tous les champs obligatoires sont requis" });
    }

    // Vérification des types des champs
    if (typeof totalSpots !== "number" || typeof availableSpots !== "number") {
      return res.status(400).json({
        message:
          "Les champs 'totalSpots' et 'availableSpots' doivent être des nombres",
      });
    }

    if (typeof pricing !== "object" || typeof pricing.hourly !== "number") {
      return res.status(400).json({
        message:
          "Les informations de tarification horaire doivent être des nombres",
      });
    }

    // Vérification des types de véhicules
    if (!Array.isArray(vehicleTypes) || vehicleTypes.length === 0) {
      return res
        .status(400)
        .json({ message: "Les types de véhicules sont requis" });
    }

    // Vérification des fonctionnalités si présentes
    if (features && !Array.isArray(features)) {
      return res
        .status(400)
        .json({ message: "Les fonctionnalités doivent être un tableau" });
    }

    // Création de la demande de parking (action 'create')
    const parkingRequest = new ParkingRequest({
      action: "create", // L'action 'create' pour cette demande
      status: "pending", // Le statut initial est 'pending'
      Owner: req.user._id,
      name,
      description,
      position,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      features: features || [],
      images: req.files ? req.files.map((file) => file.path) : [],
    });

    // Sauvegarder la demande de parking
    await parkingRequest.save();

    // Si c'est un Admin, on peut directement créer le parking
    if (req.user.role === "Admin") {
      const parking = new Parking({
        name,
        description,
        position,
        totalSpots,
        availableSpots,
        pricing,
        vehicleTypes,
        features: features || [],
        images: req.files ? req.files.map((file) => file.path) : [],
        Owner: req.user._id,
      });

      await parking.save();
      return res.status(201).json(parking);
    }

    // Si c'est un Owner, on attend la validation de l'admin
    return res.status(201).json({
      message: "Demande de parking soumise avec succès",
      parkingRequest,
    });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({
      message: "Erreur serveur lors de la création du parking",
      error: error.message,
    });
  }
};

// Récupérer tous les parkings
const getParkings = async (req, res) => {
  try {
    const parkings = await Parking.find();
    res.status(200).json(parkings);
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des parkings",
      error: error.message,
    });
  }
};

// Récupérer un parking par ID
const getParkingById = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }
    res.status(200).json(parking);
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur lors de la récupération du parking",
      error: error.message,
    });
  }
};

const updateParking = async (req, res) => {
  try {
    const parkingId = req.params.id;
    console.log("📌 Requête reçue pour mise à jour du parking:", parkingId);

    const {
      name,
      description,
      position,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      features,
    } = req.body;

    // Vérifier si le parking existe
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      console.log("❌ Parking non trouvé");
      return res.status(404).json({ message: "Parking non trouvé" });
    }

    // Vérification des permissions
    if (req.user.role !== "Admin" && parking.Owner.toString() !== req.user.id) {
      console.log(
        "⛔ Accès refusé - L'utilisateur ne peut pas modifier ce parking"
      );
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Vérifier que tous les champs obligatoires sont fournis
    if (
      !name ||
      !position ||
      !totalSpots ||
      !availableSpots ||
      !pricing ||
      !vehicleTypes
    ) {
      console.log("⚠️ Champs obligatoires manquants");
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    // 📌 Gestion des images
    let images = parking.images || [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.path);
      console.log("📷 Nouvelles images téléchargées:", images);
    }

    // Création d'une demande de mise à jour
    const parkingRequest = new ParkingRequest({
      action: "update",
      status: "pending",
      parkingId,
      name,
      description,
      position,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      features: features || [],
      images,
      Owner: req.user._id,
    });

    await parkingRequest.save();
    console.log("✅ Demande de mise à jour sauvegardée:", parkingRequest);

    // 📌 Traitement pour les Admins (mise à jour immédiate si la demande est acceptée)
    if (req.user.role === "Admin") {
      if (parkingRequest.status === "accepted") {
        console.log(
          "🔄 Mise à jour immédiate du parking car l'Admin a accepté"
        );

        const updatedParking = await Parking.findByIdAndUpdate(
          parkingId,
          {
            name,
            description,
            position,
            totalSpots,
            availableSpots,
            pricing,
            vehicleTypes,
            features: features || [],
            images,
          },
          { new: true, runValidators: true }
        );

        if (!updatedParking) {
          console.log("❌ Parking introuvable après mise à jour");
          return res
            .status(404)
            .json({ message: "Parking introuvable après mise à jour" });
        }

        console.log("✅ Parking mis à jour avec succès:", updatedParking);
        return res
          .status(200)
          .json({ message: "Parking mis à jour avec succès", updatedParking });
      }

      console.log("⏳ Demande en attente d'approbation Admin");
      return res.status(200).json({
        message: "Demande de mise à jour en attente d'approbation",
        parkingRequest,
      });
    }

    // ✅ Réponse finale pour les autres utilisateurs
    console.log("📝 Demande de mise à jour soumise avec succès");
    return res.status(200).json({
      message: "Demande de mise à jour soumise avec succès",
      parkingRequest,
    });
  } catch (error) {
    console.error("❌ Erreur serveur:", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la mise à jour du parking",
      error: error.message,
    });
  }
};

const deleteParking = async (req, res) => {
  try {
    const { id } = req.params; // Récupérer l'ID depuis les paramètres de l'URL

    const parking = await Parking.findById(id);
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }

    await Parking.findByIdAndDelete(id);

    res.status(200).json({ message: "Parking supprimé avec succès" });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

const getNearbyRecommendedParkings = async (lat, lng, limit = 10) => {
  try {
    const nearbyParkings = await Parking.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          spherical: true,
          query: {
            status: "accepted",
            availableSpots: { $gt: 0 },
          },
        },
      },
      { $limit: limit },
    ]);

    return nearbyParkings;
  } catch (error) {
    console.error("Error fetching nearby parkings:", error);
    throw error;
  }
};
const approveParkingRequest = async (req, res) => {
  try {
    const requestId = req.params.id;

    // Vérifier si la demande existe
    const parkingRequest = await ParkingRequest.findById(requestId);
    if (!parkingRequest) {
      return res
        .status(404)
        .json({ message: "Demande de modification non trouvée" });
    }

    // Vérifier si l'utilisateur est un admin
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Accès refusé, autorisation insuffisante" });
    }

    if (parkingRequest.action === "update") {
      // Mettre à jour le parking avec les nouvelles informations
      const updatedParking = await Parking.findByIdAndUpdate(
        parkingRequest.parkingId,
        {
          name: parkingRequest.name,
          description: parkingRequest.description,
          position: parkingRequest.position,
          totalSpots: parkingRequest.totalSpots,
          availableSpots: parkingRequest.availableSpots,
          pricing: parkingRequest.pricing,
          vehicleTypes: parkingRequest.vehicleTypes,
          features: parkingRequest.features,
          images: parkingRequest.images,
        },
        { new: true, runValidators: true }
      );

      if (!updatedParking) {
        return res.status(404).json({ message: "Parking non trouvé" });
      }
    } else if (parkingRequest.action === "delete") {
      // Supprimer le parking
      await Parking.findByIdAndDelete(parkingRequest.parkingId);
    }

    // ✅ Supprimer la requête une fois traitée
    await ParkingRequest.findByIdAndDelete(parkingRequest._id);

    return res
      .status(200)
      .json({ message: "Demande traitée avec succès et supprimée" });
  } catch (error) {
    console.error("Erreur lors de l'approbation :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  createParking,
  getParkings,
  getParkingById,
  updateParking,
  deleteParking,
  approveParkingRequest,
  getParkingsByEmployee,
  updateTotalSpots,
  getNearbyRecommendedParkings,
};
