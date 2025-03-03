const sendEmail = require('../utils/sendEmail'); 
const express = require("express");
const router = express.Router();
const ParkingRequest = require('../models/parkingRequestModel');  
const Parking = require('../models/parkingModel');  
const { verifyToken, verifyRole } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware").upload;
const { validateParkingData } = require("../utils/validation");



const { 
  createParking, 
  getParkings, 
  getParkingById, 
  updateParking, 
  deleteParking 
} = require("../services/parkingService");
router.put('/requests/:id', express.json(), express.urlencoded({ extended: true }), upload, async (req, res) => {
  const { status } = req.body;
  const requestId = req.params.id;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  try {
    const parkingRequest = await ParkingRequest.findById(requestId).populate('Owner');
    if (!parkingRequest) return res.status(404).json({ message: "Demande introuvable" });

    // 📌 Ajout des images reçues
    if (req.files && req.files.length === 4) {
      parkingRequest.images = req.files.map(file => file.path); // 📌 Stocker les chemins des images
    }

    if (status === 'accepted') {
      // ✅ Vérifier les données avant acceptation
      const errorMessage = validateParkingData(parkingRequest);
      if (errorMessage) return res.status(400).json({ message: errorMessage });

      if (!parkingRequest.images || parkingRequest.images.length !== 4) {
        return res.status(400).json({ message: "La demande doit contenir exactement 4 images." });
      }

      let parking;
      if (parkingRequest.parkingId) {
        // ✅ Mettre à jour un parking existant
        parking = await Parking.findByIdAndUpdate(
          parkingRequest.parkingId,
          { ...parkingRequest.toObject(), images: parkingRequest.images },
          { new: true }
        );
        if (!parking) return res.status(404).json({ message: "Parking introuvable pour mise à jour" });
      } else {
        // ✅ Vérifier l'existence d'un parking similaire
        const existingParking = await Parking.findOne({ nameP: parkingRequest.nameP, location: parkingRequest.location, Owner: parkingRequest.Owner._id });
        if (existingParking) {
          return res.status(400).json({ message: "Un parking avec ces informations existe déjà" });
        }

        // ✅ Création d'un nouveau parking
        parking = new Parking({ ...parkingRequest.toObject(), images: parkingRequest.images });
        await parking.save();
        parkingRequest.parkingId = parking._id;
      }
    }

    // ✅ Mise à jour du statut de la demande
    parkingRequest.status = status;
    await parkingRequest.save();

    // ✅ Envoi de l'email au propriétaire
    const ownerEmail = parkingRequest.Owner?.email;
    if (ownerEmail) {
      try {
        await sendEmail({
          email: ownerEmail,
          subject: `Votre demande de parking a été ${status}`,
          message: `Bonjour,\n\nVotre demande de parking pour ${parkingRequest.nameP} a été ${status}.\nMerci de votre patience.`
        });
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email :", emailError);
        return res.status(500).json({ message: "Erreur lors de l'envoi de l'email" });
      }
    }

    res.status(200).json({ message: `Demande ${status}`, parkingRequest });

  } catch (error) {
    console.error("Erreur lors de la mise à jour de la demande :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour", error: error.message });
  }
});




router.get("/requests", express.urlencoded({ extended: true }),  async (req, res) => {
  try {
    const parkingRequests = await ParkingRequest.find().populate("Owner", "name email").populate("parkingId");
    res.status(200).json(parkingRequests);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des demandes de parking", error });
  }
});
router.get("/requests/:id",  express.urlencoded({ extended: true }), verifyToken, verifyRole("Admin"),async (req, res) => {
  try {
    const parkingRequest = await ParkingRequest.findById(req.params.id).populate("Owner", "name email").populate("parkingId");
    if (!parkingRequest) {
      return res.status(404).json({ message: "Demande de parking non trouvée" });
    }
    res.status(200).json(parkingRequest);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de la demande de parking", error });
  }
});
// ✅ Fonction pour supprimer une requête
async function deleteRequest(requestId) {
  try {
    await ParkingRequest.findByIdAndDelete(requestId);
    console.log(`Requête ${requestId} supprimée avec succès.`);
  } catch (error) {
    console.error(`Erreur lors de la suppression de la requête ${requestId} :`, error);
  }
}

router.post('/submit', express.json(), express.urlencoded({ extended: true }), verifyToken, upload, async (req, res) => {
  try {
    console.log('Champs reçus:', Object.keys(req.body)); 
    console.log('Valeurs reçues:', req.body);
    console.log('Fichiers reçus:', req.files);

    let pricing = req.body.pricing;
    let vehicleTypes = req.body.vehicleTypes;

    if (typeof pricing === 'string') {
      pricing = JSON.parse(pricing); 
    }
    
    if (typeof vehicleTypes === 'string') {
      vehicleTypes = JSON.parse(vehicleTypes);
    }

    const { nameP, location } = req.body;
    const totalSpots = Number(req.body.totalSpots);
    const availableSpots = Number(req.body.availableSpots);

    pricing = {
      perHour: Number(pricing.perHour),
      perDay: Number(pricing.perDay),
      perWeek: Number(pricing.perWeek)
    };

    // 🔥 **Récupération des URLs des images**
    const images = req.files.map(file => file.path);  

    if (!nameP || !location || !totalSpots || !availableSpots || !pricing.perHour || !pricing.perDay || !pricing.perWeek || !vehicleTypes || images.length === 0) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires, y compris les images." });
    }

    console.log("Final Data:", { nameP, location, totalSpots, availableSpots, pricing, vehicleTypes, images });

    // ✅ **Enregistrement dans MongoDB**
    const newParkingRequest = new ParkingRequest({
      action: "create",
      nameP,
      location,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      images,  // ✅ Enregistrer les images
      Owner: req.user.id  // ✅ Utilisateur authentifié via `verifyToken`
    });

    await newParkingRequest.save();  // 🚀 Sauvegarde en base de données

    res.status(201).json({ message: "Demande enregistrée avec succès", data: newParkingRequest });

  } catch (error) {
    console.error("Erreur lors de la soumission :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});
// Route pour créer un parking (pour Admin ou Owner uniquement)
router.post("/parkings", verifyToken, verifyRole("Admin", "Owner"), createParking);

router.get("/parkings",  getParkings);
// Route pour obtenir un parking spécifique
router.get("/parkings/:id", verifyToken, getParkingById);
router.post("/parkings/location",  async (req, res) => {
  let { location } = req.body;

  if (!location) {
    return res.status(400).json({ message: "La localisation est requise" });
  }

  try {
    location = location.trim();
    console.log("🔍 Recherche de parkings pour la localisation :", location);

    const parkings = await Parking.find({
      location: { $regex: new RegExp(location, "i") }, // Insensible à la casse
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
router.post("/parkings/availableSpots",  async (req, res) => {
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
// Route pour mettre à jour un parking (accessible par Admin uniquement)
router.put("/parkings/:id", verifyToken, verifyRole("Owner", "Admin"), updateParking);
// Route pour supprimer un parking (accessible par Admin uniquement)
router.delete("/parkings/:id", verifyToken, verifyRole("Admin","Owner"), deleteParking);

module.exports = router;
