const sendEmail = require("../utils/sendEmail");
const express = require("express");
const router = express.Router();
const ParkingRequest = require("../models/parkingRequestModel");
const Parking = require("../models/parkingModel");
const { verifyToken, verifyRole } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMidd").upload;
const { validateParkingData } = require("../utils/validation");
const User = require("../models/userModel");


const {
  createParking,
  getParkings,
  getParkingById,
  updateParking,
  deleteParking,
  getParkingsByEmployee,
  updateTotalSpots
} = require("../services/parkingService");

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

/**
 * ✅ Met à jour une demande de parking et la supprime après modification du statut
 */
router.put('/requests/:id', upload, async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const parkingRequest = await ParkingRequest.findById(requestId).populate("Owner");
    if (!parkingRequest) return res.status(404).json({ message: "Demande introuvable" });

    // 📌 Assurer que `position` existe
    if (!parkingRequest.position || !parkingRequest.position.lat || !parkingRequest.position.lng) {
      return res.status(400).json({ message: "Erreur : Position (lat, lng) manquante." });
    }

    // 📌 Assurer que `pricing` est bien formaté
    if (!parkingRequest.pricing || typeof parkingRequest.pricing !== "object") {
      return res.status(400).json({ message: "Erreur : Informations de tarification manquantes." });
    }

    // 📌 Assurer que `vehicleTypes` existe et est un tableau
    if (!Array.isArray(parkingRequest.vehicleTypes) || parkingRequest.vehicleTypes.length === 0) {
      return res.status(400).json({ message: "Erreur : Types de véhicules manquants." });
    }

    // 📌 Vérifier que les images sont bien reçues (si mises à jour)
    if (req.files && req.files.length === 4) {
      parkingRequest.images = req.files.map((file) => file.path);
    }

    let parking;
    if (status === "accepted") {
      // ✅ Vérifier que toutes les données requises sont bien présentes
      if (!parkingRequest.images || parkingRequest.images.length !== 4) {
        return res.status(400).json({ message: "Erreur : La demande doit contenir exactement 4 images." });
      }

      if (parkingRequest.parkingId) {
        // ✅ Mettre à jour un parking existant
        parking = await Parking.findByIdAndUpdate(
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
            Owner: parkingRequest.Owner._id,
            status: "accepted",
          },
          { new: true }
        );
        if (!parking) return res.status(404).json({ message: "Parking introuvable pour mise à jour" });
      } else {
        // ✅ Vérifier si un parking similaire existe
        const existingParking = await Parking.findOne({
          name: parkingRequest.name,
          position: parkingRequest.position,
          Owner: parkingRequest.Owner._id,
        });

        if (existingParking) {
          return res.status(400).json({ message: "Un parking avec ces informations existe déjà" });
        }

        // ✅ Création d'un nouveau parking
        parking = new Parking({
          name: parkingRequest.name,
          description: parkingRequest.description,
          position: parkingRequest.position,
          totalSpots: parkingRequest.totalSpots,
          availableSpots: parkingRequest.availableSpots,
          pricing: parkingRequest.pricing,
          vehicleTypes: parkingRequest.vehicleTypes,
          features: parkingRequest.features,
          images: parkingRequest.images,
          Owner: parkingRequest.Owner._id,
          status: "accepted",
        });

        await parking.save();
      }
    }

    // ✅ Envoi d'un email au propriétaire
    const ownerEmail = parkingRequest.Owner?.email;
    if (ownerEmail) {
      try {
        await sendEmail({
          email: ownerEmail,
          subject: `Votre demande de parking a été ${status}`,
          message: `Bonjour,\n\nVotre demande de parking pour ${parkingRequest.name} a été ${status}.\nMerci de votre patience.`,
        });
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email :", emailError);
      }
    }

    // ✅ Suppression de la demande après mise à jour du statut
    await ParkingRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: `Demande ${status} et supprimée`, parking });

  } catch (error) {
    console.error("Erreur lors de la mise à jour de la demande :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour", error: error.message });
  }
});



/**
 * ✅ Récupérer toutes les demandes de parking
 */
router.get("/requests", async (req, res) => {
  try {
    const parkingRequests = await ParkingRequest.find()
      .populate("Owner", "name email")
      .populate("parkingId");
    res.status(200).json(parkingRequests);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des demandes de parking", error });
  }
});

/**
 * ✅ Supprimer une requête spécifique
 */
async function deleteRequest(requestId) {
  try {
    await ParkingRequest.findByIdAndDelete(requestId);
    console.log(`Requête ${requestId} supprimée avec succès.`);
  } catch (error) {
    console.error(`Erreur lors de la suppression de la requête ${requestId} :`, error);
  }
}

/**
 * ✅ Soumettre une demande de parking
 */
router.post("/submit", verifyToken, upload, async (req, res) => {
  try {
    let { name, description, position, totalSpots, availableSpots, pricing, vehicleTypes, features } = req.body;

    console.log("📌 Requête reçue :", req.body);

    // ✅ Convertir les objets si envoyés en string
    if (typeof position === "string") position = JSON.parse(position);
    if (typeof pricing === "string") pricing = JSON.parse(pricing);
    if (typeof vehicleTypes === "string") vehicleTypes = JSON.parse(vehicleTypes);
    if (typeof features === "string") features = JSON.parse(features);

    // ✅ Vérifier que `position` contient `lat` et `lng`
    if (!position || typeof position.lat !== "number" || typeof position.lng !== "number") {
      return res.status(400).json({ message: "Position invalide. Format attendu: { lat: Number, lng: Number }" });
    }

    totalSpots = Number(totalSpots);
    availableSpots = Number(availableSpots);
    
    // ✅ Mise à jour du format de pricing selon le nouveau schéma
    pricing = {
      hourly: Number(pricing.hourly || 0),
      daily: Number(pricing.daily || 0),
      weekly: Number(pricing.weekly || 0),
      monthly: Number(pricing.monthly || 0),
    };

    const images = req.files.map((file) => file.path);

    // ✅ Vérification des champs obligatoires
    if (!name || !totalSpots || !availableSpots || !pricing.hourly || !vehicleTypes || images.length === 0) {
      return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis, y compris 4 images." });
    }

    // ✅ Vérification des types de véhicules
    const validVehicleTypes = ['Moto', 'Citadine', 'Berline / Petit SUV', 'Familiale / Grand SUV', 'Utilitaire'];
    const invalidTypes = vehicleTypes.filter(type => !validVehicleTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({ message: `Types de véhicules invalides: ${invalidTypes.join(', ')}` });
    }

    // ✅ Vérification des fonctionnalités
    if (features) {
      const validFeatures = ["Indoor Parking", "Underground Parking", "Unlimited Entrances & Exits", "Extension Available"];
      const invalidFeatures = features.filter(feature => !validFeatures.includes(feature));
      if (invalidFeatures.length > 0) {
        return res.status(400).json({ message: `Fonctionnalités invalides: ${invalidFeatures.join(', ')}` });
      }
    }

    const newParkingRequest = new ParkingRequest({
      action: "create",
      name,
      description,
      position,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      features: features || [],
      images,
      Owner: req.user.id,
    });

    await newParkingRequest.save();
    res.status(201).json({ message: "Demande enregistrée avec succès", data: newParkingRequest });

  } catch (error) {
    console.error("❌ Erreur lors de la soumission :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});
/**
 * ✅ Récupère tous les parkings
 */
router.get("/parkings", async (req, res) => {
  try {
    // Récupère tous les parkings et populate le champ Owner pour avoir les infos du propriétaire
    const parkings = await Parking.find()
      .populate("Owner", "name email")
      .sort({ createdAt: -1 }); // Trie par date de création (plus récent d'abord)
    
    if (parkings.length === 0) {
      return res.status(200).json([]); // Retourne un tableau vide si aucun parking n'est trouvé
    }
    
    console.log(`🚗 ${parkings.length} parkings récupérés avec succès`);
    res.status(200).json(parkings);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des parkings:", error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la récupération des parkings", 
      error: error.message 
    });
  }
});

/**
 * ✅ Récupère un parking par son ID
 */
router.get("/parkings/:id", async (req, res) => {
  try {
    const parkingId = req.params.id;
    
    // Vérifie si l'ID est au format valide pour MongoDB
    if (!parkingId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de parking invalide" });
    }
    
    const parking = await Parking.findById(parkingId)
      .populate("Owner", "name email");
      
    if (!parking) {
      return res.status(404).json({ message: "Parking non trouvé" });
    }
    
    console.log(`🚗 Parking ${parkingId} récupéré avec succès`);
    res.status(200).json(parking);
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération du parking ${req.params.id}:`, error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la récupération du parking", 
      error: error.message 
    });
  }
});
router.get("/check-pending/:parkingId", async (req, res) => {
  try {
    const { parkingId } = req.params;

    const existingRequest = await ParkingRequest.findOne({
      parkingId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "Une demande de mise à jour est déjà en attente pour ce parking.",
      });
    }

    return res.status(200).json({ message: "Aucune requête en attente." });
  } catch (error) {
    console.error("❌ Erreur lors de la vérification des requêtes :", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la vérification des requêtes.",
    });
  }
});

/**
 * ✅ Rechercher des parkings par localisation avec coordonnées `{ lat, lng }`
 */
router.post("/parkings/position", async (req, res) => {
  let { position } = req.body;

  if (!position || !position.lat || !position.lng) {
    return res.status(400).json({ message: "La localisation est requise avec lat et lng" });
  }

  try {
    console.log("🔍 Recherche de parkings pour la localisation :", position);

    const parkings = await Parking.find({
      "position.lat": { $gte: position.lat - 0.05, $lte: position.lat + 0.05 },
      "position.lng": { $gte: position.lng - 0.05, $lte: position.lng + 0.05 },
    });

    if (parkings.length === 0) {
      return res.status(404).json({ message: "Aucun parking trouvé pour cette localisation" });
    }

    res.status(200).json(parkings);
  } catch (error) {
    console.error("❌ Erreur serveur :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des parkings", error: error.message });
  }
});
router.get("/my-parkings", verifyToken, async (req, res) => {
  try {
    const ownerId = req.user.id; // Récupérer l'ID de l'Owner à partir du token

    const parkings = await Parking.find({ Owner: ownerId })
      .populate("Owner", "name email") // Récupérer les infos du propriétaire
      .populate("id_employee", "name"); // 🔥 Récupérer le nom de l'employé assigné

    if (parkings.length === 0) {
      return res.status(404).json({ message: "Aucun parking trouvé pour cet utilisateur" });
    }

    res.status(200).json(parkings);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des parkings de l'Owner :", error);
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des parkings",
      error: error.message,
    });
  }
});

router.put("/assign-employee/:parkingId/:employeeId", verifyToken, verifyRole("Owner"), async (req, res) => {
  try {
      const { parkingId, employeeId } = req.params;

      console.log(`🚀 Assignation employé - Parking: ${parkingId}, Employé: ${employeeId}`);

      // Vérifier si le parking existe
      const parking = await Parking.findById(parkingId);
      if (!parking) {
          console.log("❌ Parking non trouvé");
          return res.status(404).json({ message: "Parking non trouvé" });
      }
      console.log(`✅ Parking trouvé: ${parking.name}`);

      // Vérifier si l'utilisateur connecté est bien le propriétaire du parking
      console.log(`🔍 ID propriétaire attendu: ${parking.Owner.toString()}, ID connecté: ${req.user.id}`);
      if (parking.Owner.toString() !== req.user.id) {
          console.log("❌ Accès interdit: l'utilisateur n'est pas le propriétaire");
          return res.status(403).json({ message: "Accès interdit : vous n'êtes pas le propriétaire de ce parking" });
      }
      console.log("✅ Propriétaire vérifié");

      // Vérifier si l'employé existe et a le rôle "Employe"
      const employee = await User.findById(employeeId);
      if (!employee) {
          console.log("❌ Employé non trouvé");
          return res.status(404).json({ message: "Employé non trouvé" });
      }

      if (employee.role !== "Employe") {
          console.log("❌ L'utilisateur sélectionné n'est pas un employé valide");
          return res.status(400).json({ message: "L'utilisateur sélectionné n'est pas un employé valide" });
      }
      console.log(`✅ Employé trouvé: ${employee.name}`);

      // Assigner l'employé au parking
      parking.id_employee = employeeId;
      await parking.save();
      console.log(`✅ Employé assigné: ${employeeId} au parking: ${parkingId}`);

      res.status(200).json({ message: "Employé assigné avec succès", parking });

  } catch (error) {
      console.error("💥 Erreur serveur:", error);
      res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});




/**
 * ✅ Rechercher des parkings par nombre de places disponibles
 */
router.post("/parkings/availableSpots", async (req, res) => {
  let { availableSpots } = req.body;

  if (!availableSpots || isNaN(availableSpots)) {
    return res.status(400).json({ message: "Le nombre de places disponibles est requis et doit être un nombre." });
  }

  availableSpots = parseInt(availableSpots);

  try {
    console.log("🔍 Recherche de parkings avec au moins", availableSpots, "places disponibles");

    const parkings = await Parking.find({
      availableSpots: { $gte: availableSpots }, // Cherche les parkings avec un nombre de places >= à la valeur donnée
    });

    if (parkings.length === 0) {
      return res.status(404).json({ message: "Aucun parking trouvé avec ce nombre de places disponibles" });
    }

    res.status(200).json(parkings);
  } catch (error) {
    console.error("❌ Erreur serveur :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des parkings", error: error.message });
  }
});

router.put("/parkings/:id", verifyToken, verifyRole("Owner", "Admin"), updateParking);
router.delete("/parkings/:id", verifyToken, verifyRole("Admin", "Owner"), deleteParking);
router.get("/parkings-by-employee/:employeeId", getParkingsByEmployee); // 🔹 Nouvelle route
router.patch("/update-total-spots/:id", updateTotalSpots);

module.exports = router;