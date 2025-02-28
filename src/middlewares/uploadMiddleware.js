const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// Configuration de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuration de Multer pour stocker les images sur Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_images",
    format: async (req, file) => "jpg",  // Force le format jpg
    public_id: (req, file) => {
      if (!file) {
        throw new Error('No file uploaded');
      }
      return Date.now() + "-" + file.originalname; // Utilisation correcte du file
    }
  }
});

// Initialisation de multer pour gérer le fichier unique
const upload = multer({ storage }).single("image");

module.exports = { upload };
