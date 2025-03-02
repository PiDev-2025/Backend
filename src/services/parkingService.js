const { v4: uuidv4 } = require('uuid'); 
const ParkingRequest = require("../models/parkingRequestModel");
const Parking = require("../models/parkingModel");
const fs = require('fs'); 
const path = require('path');
const createParking = async (req, res) => {
  try {
    // Log the user role
    console.log("Utilisateur connecté:", req.user);
    if (!req.user || !["Admin", "Owner"].includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé, rôle non autorisé" });
    }

    const { nameP, location, totalSpots, availableSpots, pricing } = req.body;

    // Vérification des champs requis
    if (!nameP || !location || !totalSpots || !availableSpots || !pricing) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    // Vérification des types des champs
    if (typeof totalSpots !== 'number' || typeof availableSpots !== 'number') {
      return res.status(400).json({ message: "Les champs 'totalSpots' et 'availableSpots' doivent être des nombres" });
    }

    if (typeof pricing !== 'object' || 
      typeof pricing.perHour !== 'number' || 
      typeof pricing.perDay !== 'number' || 
      typeof pricing.perWeek !== 'number') {
    return res.status(400).json({ message: 'Les informations de prix doivent être des nombres' });
  }

    // Création de la demande de parking (action 'create')
    const parkingRequest = new ParkingRequest({
      action: 'create', // L'action 'create' pour cette demande
      status: 'pending', // Le statut initial est 'pending'
      Owner: req.user._id,
      nameP,
      location,
      totalSpots,
      availableSpots,
      pricing
    });

    // Sauvegarder la demande de parking
    await parkingRequest.save();

    // Si c'est un Admin, on peut directement créer le parking
    if (req.user.role === "Admin") {
      const parking = new Parking({
        nameP,
        location,
        totalSpots,
        availableSpots,
        pricing
      });

      await parking.save();
      return res.status(201).json(parking);
    }

    // Si c'est un Owner, on attend la validation de l'admin
    return res.status(201).json({ message: "Demande de parking soumise avec succès", parkingRequest });

  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ message: "Erreur serveur lors de la création du parking", error: error.message });
  }
};
// Récupérer tous les parkings
const getParkings = async (req, res) => {
  try {
    const parkings = await Parking.find();
    res.status(200).json(parkings);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la récupération des parkings", error: error.message });
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
    res.status(500).json({ message: "Erreur serveur lors de la récupération du parking", error: error.message });
  }
};
//Envoyé Une demande pour modifier un parking
const updateParking = async (req, res) => {
  try {
    const parkingId = req.params.id;
    const { nameP, location, totalSpots, availableSpots, pricing } = req.body;

    // Vérification du parking existant
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }

    // Vérification des rôles et permissions
    if (req.user.role !== "Admin" && parking.Owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Vous ne pouvez modifier que votre propre parking" });
    }

    // Vérification des champs obligatoires
    if (!nameP || !location || !totalSpots || !availableSpots || !pricing) {
      return res.status(400).json({ message: "Tous les champs sont requis pour la mise à jour" });
    }

    // 🛠 Ajout des nouvelles images si envoyées
    let images = parking.images || [];
    if (req.files && req.files.length === 4) {
      images = req.files.map(file => file.path); // Sauvegarde les chemins des nouvelles images
    }

    // Création de la demande de modification
    const parkingRequest = new ParkingRequest({
      action: 'update',
      status: 'pending',
      parkingId,
      nameP,
      location,
      totalSpots,
      availableSpots,
      pricing,
      images, // 📌 Ajout des images ici
      Owner: req.user._id
    });

    await parkingRequest.save();

    if (req.user.role === "Admin") {
      if (parkingRequest.status === 'accepted') {
        const updatedParking = await Parking.findByIdAndUpdate(parkingId, {
          nameP,
          location,
          totalSpots,
          availableSpots,
          pricing,
          images // 📌 Mise à jour des images
        }, { new: true, runValidators: true });

        if (!updatedParking) {
          return res.status(404).json({ message: "Parking non trouvé" });
        }

        return res.status(200).json({ message: 'Parking mis à jour avec succès', updatedParking });
      } else {
        return res.status(200).json({ message: 'Demande de mise à jour en attente d\'approbation', parkingRequest });
      }
    } else {
      return res.status(200).json({ message: 'Demande de mise à jour soumise avec succès', parkingRequest });
    }

  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur lors de la mise à jour du parking", error: error.message });
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
      return res.status(403).json({ message: "Vous ne pouvez supprimer que votre propre parking" });
    }

    // Vérification des demandes en attente
    const existingRequest = await ParkingRequest.findOne({
      action: 'delete',
      parkingId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Une demande de suppression est déjà en attente." });
    }

    // 📌 Supprimer les images du stockage local
    if (parking.images && parking.images.length > 0) {
      parking.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, '..', imagePath);
        fs.unlink(fullPath, (err) => {
          if (err) console.error(`Erreur lors de la suppression de l'image: ${fullPath}`, err);
        });
      });
    }

    // Créer une demande de suppression
    const parkingRequest = new ParkingRequest({
      action: 'delete',
      status: 'pending',
      parkingId,
      Owner: req.user._id,
      nameP: parking.nameP,
      location: parking.location,
      totalSpots: parking.totalSpots,
      availableSpots: parking.availableSpots,
      pricing: parking.pricing,
      vehicleTypes: parking.vehicleTypes
    });

    await parkingRequest.save();

    return res.status(200).json({ 
      message: "Demande de suppression soumise avec succès, en attente d'approbation", 
      parkingRequest 
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
      return res.status(404).json({ message: "Demande de modification non trouvée" });
    }

    // Vérifier si l'utilisateur est un admin
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Accès refusé, autorisation insuffisante" });
    }

    if (parkingRequest.action === "update") {
      // Mettre à jour le parking avec les nouvelles informations
      const updatedParking = await Parking.findByIdAndUpdate(
        parkingRequest.parkingId,
        {
          nameP: parkingRequest.nameP,
          location: parkingRequest.location,
          totalSpots: parkingRequest.totalSpots,
          availableSpots: parkingRequest.availableSpots,
          pricing: parkingRequest.pricing,
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

    return res.status(200).json({ message: "Demande traitée avec succès et supprimée" });

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
  approveParkingRequest
 
};
