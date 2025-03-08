const ParkingRequest = require("../models/parkingRequestModel");
const cloudinary = require("cloudinary").v2;

// Mise à jour d'une demande de parking
const updateParkingRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si la demande de parking existe
    const parking = await ParkingRequest.findById(id);
    if (!parking) {
      return res.status(404).json({ message: "Parking request not found" });
    }

    // Extraire les nouvelles données du corps de la requête
    const { name, description, location, totalSpots, vehicleType, features, pricing } = req.body;

    // Mettre à jour les champs fournis
    if (name) parking.name = name;
    if (description) parking.description = description;
    if (location) parking.location = location;
    if (totalSpots) parking.totalSpots = totalSpots;
    if (vehicleType) parking.vehicleType = vehicleType;
    if (features) parking.features = features;
    if (pricing) parking.pricing = pricing;

    // Vérifier si des images ont été téléchargées via Cloudinary
    if (req.files && req.files.length > 0) {
      // Supprimer les anciennes images de Cloudinary (optionnel)
      if (parking.images.length > 0) {
        await Promise.all(
          parking.images.map(async (imageUrl) => {
            const publicId = imageUrl.split("/").pop().split(".")[0]; // Extraire l'ID public
            await cloudinary.uploader.destroy(`parking_images/${publicId}`);
          })
        );
      }

      // Ajouter les nouvelles images uploadées
      const uploadedImages = req.files.map((file) => file.path); // URLs Cloudinary
      parking.images = uploadedImages;
    }

    // Sauvegarder les modifications
    await parking.save();

    return res.status(200).json({ message: "Parking request updated", parking });
  } catch (error) {
    console.error("Error updating parking request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const saveRequestParking = async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. User ID missing." });
        }

        console.log("📝 Données reçues:", req.body);

        const imageUrls = req.files.map(file => file.path);
        const { name, description, location, totalSpots, vehicleType, features, pricing } = req.body;

        if (!name || !location || !totalSpots || !vehicleType || !pricing) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        // ✅ Vérification de la validité de location
        let parsedLocation;
        try {
            parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
            if (!parsedLocation.lat || !parsedLocation.lng) {
                throw new Error("Location must have 'lat' and 'lng'.");
            }
        } catch (error) {
            return res.status(400).json({ message: "Invalid location format. Expected { lat, lng }." });
        }

        // ✅ Parsing des autres champs JSON stringifiés
        const parsedFeatures = features ? JSON.parse(features) : [];
        const parsedPricing = pricing ? JSON.parse(pricing) : null;

        // ✅ Vérifier et convertir vehicleType en tableau si nécessaire
        let parsedVehicleType = Array.isArray(vehicleType) ? vehicleType : JSON.parse(vehicleType); // Convertir en tableau si c'est une chaîne JSON

        const newParking = new ParkingRequest({
            name,
            description,
            location: parsedLocation,  // ✅ Maintenant location est un objet
            totalSpots: parseInt(totalSpots),
            vehicleType: parsedVehicleType,  // ✅ Assurez-vous que vehicleType est un tableau
            features: parsedFeatures || [],
            pricing: parsedPricing,
            images: imageUrls,
            id_owner: userId,
        });

        await newParking.save();

        res.status(201).json({ message: "Parking added successfully!", parking: newParking });
    } catch (error) {
        console.error("❌ Error adding parking:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


module.exports = { saveRequestParking, updateParkingRequest };
