const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const connectDB = require("./src/config/db");
const cors = require('cors');
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const http = require("http");
const session = require("express-session");
require("dotenv").config();


connectDB();
console.log("JWT_SECRET:", process.env.JWT_SECRET);

// Configuration de Multer pour stocker les images sur Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_images",
    format: async (req, file) => "jpg",
    public_id: (req, file) => req.user._id },
});
const upload = multer({ storage }).single("image");


app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key", 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
  })
);


// Passport Authentication
const passport = require("./src/config/passport"); // Import the passport config
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));


// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// app.use((req, res, next) => {
  //res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  //res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  //res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  //res.header('Access-Control-Allow-Credentials', true);
  //next();
//});

app.use(express.json());

// Import Routes
const authRoutes = require("./src/routes/authRoutes.js");
const userRoutes = require("./src/routes/userRoutes");
const claimRoutes = require("./src/routes/claimRoutes");
const contractRoutes = require("./src/routes/contractRoutes");
const parkingRoutes = require("./src/routes/parkingRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const reservationRoutes = require("./src/routes/reservationRoutes");
const subscriptionRoutes = require("./src/routes/subscriptionRoutes");
const passwordRoutes = require("./src/routes/passwordRoutes");
const parkingRequestRoute = require("./src/routes/parkingRequestRoute.js");



// Routes
app.use("/auth", authRoutes);

app.use("/User", userRoutes);
app.use("/api", claimRoutes);
app.use("/api", contractRoutes);
app.use("/api", parkingRoutes);
app.use("/api", reportRoutes);
app.use("/api", reservationRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", passwordRoutes);
app.use("/api",parkingRequestRoute);



// Simple Route
app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});


// Handle preflight requests
app.options('*', cors(corsOptions));

var server = http.createServer(app)
server.listen(port,()=>{
  console.log(`server started on port ${port}!`);
})




