const express = require("express");
const app = express();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs')
const port = process.env.PORT || 3001;
const connectDB = require("./src/config/db");
const cors = require("cors");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const http = require("http");
const session = require("express-session");
require("dotenv").config();

connectDB();
console.log("JWT_SECRET:", process.env.JWT_SECRET);

// CORS Configuration
const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:5500"];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const storage = multer.memoryStorage(); // Utilise la mémoire pour stocker les fichiers temporaires
const upload = multer({ storage: storage });


// Apply CORS Middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// Express Middleware
app.use(express.json());

// Express-Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// Passport Authentication
const passport = require("./src/config/passport");
app.use(passport.initialize());
app.use(passport.session());

// Import Routes
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const claimRoutes = require("./src/routes/claimRoutes");
const contractRoutes = require("./src/routes/contractRoutes");
const parkingRoutes = require("./src/routes/parkingRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const reservationRoutes = require("./src/routes/reservationRoutes");
const subscriptionRoutes = require("./src/routes/subscriptionRoutes");
const passwordRoutes = require("./src/routes/passwordRoutes");
const parkingRequestRoutes = require ("./src/routes/parkingRequestRoute");

// Define Routes
app.use("/auth", authRoutes);

// This line in server.js is using '/User' which matches what the frontend is using
app.use("/User", userRoutes);

app.use("/api", claimRoutes);
app.use("/api", contractRoutes);
app.use("/api", parkingRoutes);
app.use("/api", reportRoutes);
app.use("/api", reservationRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", passwordRoutes);
app.use("/api", parkingRequestRoutes);
app.use(express.json());

// Route pour uploader les images
app.post('/upload-images', upload.array('images'), async (req, res) => {  // "images" doit correspondre au champ envoyé
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No images uploaded');
    }

    const formData = new FormData();
    req.files.forEach(file => {
      formData.append('images', file.buffer, file.originalname);
    });

    const response = await axios.post('https://api.kiriengine.app/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        // Ajouter un header d'authentification si nécessaire
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error uploading images:', error.response ? error.response.data : error.message);
    res.status(500).send('Error uploading images');
  }
});


// Test Route
app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});

// Start Server
const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server started on port ${port}!`);
});
