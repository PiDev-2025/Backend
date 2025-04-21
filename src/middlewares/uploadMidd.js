const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const jwt = require("jsonwebtoken");
const User = require("../models/userModel"); // Add your user model import

// Middleware to get user from token
const getUserFromToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Authentication failed. Token missing." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    const user = await User.findById(decoded.userId || decoded.id);
    console.log("User Found:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed.", error: error.message });
  }
};




// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage configuration to upload images to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_images",
    format: async (req, file) => "jpg",  // Force JPG format
    public_id: (req, file) => {
      if (!file) {
        throw new Error('No file uploaded');
      }
      return Date.now() + "-" + file.originalname; // Use a timestamp + original file name for the public ID
    }
  }
});

// Initialize multer to handle a single image upload
const upload = multer({ storage }).array('images', 4);

module.exports = { upload, getUserFromToken  };
