import parkingRequest from "../models/parkingRequestmodele";

const saveRequestParking = async (req, res) => {
    try {
      // Vérifier l'utilisateur à partir du token
      const userId = req.user._id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized. User ID missing." });
      }
  
      // Vérifier si des images sont uploadées
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "At least one image is required." });
      }
  
      // Extraire les URLs des images uploadées sur Cloudinary
      const imageUrls = req.files.map(file => file.path);
  
      // Récupérer les autres champs du formulaire
      const { name, description, location, availableSpots, totalSpots, vehicleType, features, pricing } = req.body;
  
      // Vérifier que les champs obligatoires sont remplis
      if (!name || !location || !availableSpots || !totalSpots || !vehicleType || !pricing) {
        return res.status(400).json({ message: "Missing required fields." });
      }
  
      // Création du parking
      const newParking = new parkingRequest({
        name,
        description,
        location,
        availableSpots,
        totalSpots,
        vehicleType,
        features: features || [],
        pricing,
        images: imageUrls,
        id_owner: userId,
      });
  
      // Sauvegarde en base de données
      await newParking.save();
      
      res.status(201).json({ message: "Parking added successfully!", parking: newParking });
  
    } catch (error) {
      console.error("Error adding parking:", error);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  };
  

  module.exports = { saveRequestParking }