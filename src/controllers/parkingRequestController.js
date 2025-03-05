const ParkingRequest = require("../models/parkingRequestmodele");

const updateParkingImages = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Vérifier si le parking existe
        const parking = await ParkingRequest.findById(id);
        if (!parking) {
            return res.status(404).json({ message: "Parking request not found" });
        }

        // Vérifier si des images ont été téléchargées
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No images provided." });
        }

        // Ajouter les nouvelles images à Cloudinary et stocker leurs URLs
        const newImageUrls = req.files.map(file => file.path);
        parking.images.push(...newImageUrls);

        // Sauvegarder les modifications
        await parking.save();

        return res.status(200).json({ 
            message: "Images added successfully", 
            images: parking.images 
        });
    } catch (error) {
        console.error("Error updating parking images:", error);
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

module.exports = { saveRequestParking, updateParkingImages };
