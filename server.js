const express = require("express");
const app = express();
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

// Multer Configuration for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_images",
    format: async (req, file) => "jpg",
    public_id: (req, file) => req.user._id,
  },
});
const upload = multer({ storage }).single("image");

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

// Define Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/api", claimRoutes);
app.use("/api", contractRoutes);
app.use("/api", parkingRoutes);
app.use("/api", reportRoutes);
app.use("/api", reservationRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", passwordRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});

// Start Server
const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server started on port ${port}!`);
});
