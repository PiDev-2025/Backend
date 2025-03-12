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

    // Use Owner instead of id_owner to match schema
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

//Envoyé Une demande pour modifier un parking
const updateParking = async (req, res) => {
  try {
    const parkingId = req.params.id;
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

    // Vérification du parking existant
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }

    // Vérification des rôles et permissions
    if (req.user.role !== "Admin" && parking.Owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Vous ne pouvez modifier que votre propre parking" });
    }

    // Vérification des champs obligatoires
    if (
      !name ||
      !position ||
      !totalSpots ||
      !availableSpots ||
      !pricing ||
      !vehicleTypes
    ) {
      return res.status(400).json({
        message: "Tous les champs obligatoires sont requis pour la mise à jour",
      });
    }

    // 🛠 Ajout des nouvelles images si envoyées
    let images = parking.images || [];
    if (req.files && req.files.length === 4) {
      images = req.files.map((file) => file.path); // Sauvegarde les chemins des nouvelles images
    }

    // Création de la demande de modification
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
      images, // 📌 Ajout des images ici
      Owner: req.user._id,
    });

    await parkingRequest.save();

    if (req.user.role === "Admin") {
      if (parkingRequest.status === "accepted") {
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
            images, // 📌 Mise à jour des images
          },
          { new: true, runValidators: true }
        );

        if (!updatedParking) {
          return res.status(404).json({ message: "Parking non trouvé" });
        }

        return res
          .status(200)
          .json({ message: "Parking mis à jour avec succès", updatedParking });
      } else {
        return res.status(200).json({
          message: "Demande de mise à jour en attente d'approbation",
          parkingRequest,
        });
      }
    } else {
      return res.status(200).json({
        message: "Demande de mise à jour soumise avec succès",
        parkingRequest,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur lors de la mise à jour du parking",
      error: error.message,
    });
  }
};

const deleteParking = async (req, res) => {
  try {
    console.log("Utilisateur connecté:", req.user);

    const parkingId = req.params.id;

    // Vérifier si le parking existe
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }

    // Vérification des permissions
    if (req.user.role !== "Admin" && parking.Owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Vous ne pouvez supprimer que votre propre parking" });
    }

    // Vérification des demandes en attente
    const existingRequest = await ParkingRequest.findOne({
      action: "delete",
      parkingId,
      status: "pending",
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Une demande de suppression est déjà en attente." });
    }

    // 📌 Supprimer les images du stockage local
    if (parking.images && parking.images.length > 0) {
      parking.images.forEach((imagePath) => {
        const fullPath = path.join(__dirname, "..", imagePath);
        fs.unlink(fullPath, (err) => {
          if (err)
            console.error(
              `Erreur lors de la suppression de l'image: ${fullPath}`,
              err
            );
        });
      });
    }

    // Créer une demande de suppression
    const parkingRequest = new ParkingRequest({
      action: "delete",
      status: "pending",
      parkingId,
      Owner: req.user._id,
      name: parking.name,
      description: parking.description,
      position: parking.position,
      totalSpots: parking.totalSpots,
      availableSpots: parking.availableSpots,
      pricing: parking.pricing,
      vehicleTypes: parking.vehicleTypes,
      features: parking.features || [],
    });

    await parkingRequest.save();

    return res.status(200).json({
      message:
        "Demande de suppression soumise avec succès, en attente d'approbation",
      parkingRequest,
    });
  } catch (error) {
    console.error("Erreur serveur lors de la suppression du parking:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
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
};
