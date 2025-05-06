const express = require("express");
const app = express();
// Protection contre le fingerprinting - désactiver l'en-tête X-Powered-By
app.disable('x-powered-by');

// Ajouter helmet pour une sécurité renforcée avec paramètres spécifiques
const helmet = require("helmet");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Use process.env.PORT provided by Heroku or default to 3001
const port = process.env.PORT || 3001;
const connectDB = require("./src/config/db");
const { MONGO_ATLAS_URI } = require("./src/config/db");
const cors = require("cors");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const MongoStore = require('connect-mongo'); // Import connect-mongo
require("dotenv").config();

// Définition explicite d'une clé secrète de session pour éviter l'erreur "secret option required for sessions"
const SESSION_SECRET = process.env.SESSION_SECRET || "parkini_secure_session_key_2025";

connectDB();
// Supprimer l'affichage des secrets dans les logs
// console.log("JWT_SECRET:", process.env.JWT_SECRET);

// CORS Configuration
const allowedOrigins = ["http://localhost:3000", "https://front-end-front-office.vercel.app", "https:dashboard-admin-parkiini.vercel.app", "http://localhost:5173", 
  // Ajouter ici vos domaines de production avec HTTPS
  "https://yourproductiondomain.com"
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT","PATCH" , "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 heures de mise en cache des préflight requests
};

// Apply CORS Middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// Express Middleware
app.use(express.json({ limit: '1mb' })); // Limite la taille des requêtes JSON
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Limite la taille des requêtes formulaires

// Express-Session Configuration - Utilisation de la clé secrète définie explicitement
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_ATLAS_URI, // Use Atlas URI directly
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // En production, activer HTTPS uniquement
      httpOnly: true, // CORRECTION: Activer httpOnly pour empêcher l'accès via JavaScript côté client
      sameSite: 'strict', // Protection contre CSRF
      maxAge: 3600000 // Session d'une heure (en millisecondes)
    },
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

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads/plates');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Import Routes
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const claimRoutes = require("./src/routes/claimRoutes");
const contractRoutes = require("./src/routes/contractRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const reservationRoutes = require("./src/routes/reservationRoutes");
const subscriptionRoutes = require("./src/routes/subscriptionRoutes");
const passwordRoutes = require("./src/routes/passwordRoutes");
const parkingRoutes = require("./src/routes/parkingRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");

const paymentRoutes = require("./src/routes/paymentRoutes");

const plateDetectionRoutes = require('./src/routes/plateDetectionRoutes');


// Import Monitoring
const { register, metricsMiddleware } = require('./src/monitoring');

// Import error handlers
const claimErrorHandler = require('./src/middlewares/claimErrorHandler');

// Ajoutez le middleware de métriques
app.use(metricsMiddleware);

// Endpoint pour les métriques Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// Create HTTP & Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Socket.IO Connection handling
io.on('connection', (socket) => {
  //console.log('User connected:', socket.id);

  // Authenticate socket connection using token
  socket.on('authenticate', async (token) => {
    try {
      // Verify token and get user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      // Join a room specific to this user
      socket.join(`user_${decoded.id}`);
    } catch (error) {
      console.error('Socket authentication failed:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to our routes
app.set('io', io);

// Define Routes
app.use("/auth", authRoutes);

app.use("/User", userRoutes);
app.use("/api", claimRoutes);
app.use("/api", contractRoutes);
app.use("/api", reportRoutes);
app.use("/api", reservationRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", passwordRoutes);
app.use('/parkings', parkingRoutes); 
app.use("/api/notifications", notificationRoutes);
app.use('/api/notify', notificationRoutes);

app.use('/api/payments', paymentRoutes);

app.use('/api/plate-detection', plateDetectionRoutes);

// Add error handlers
app.use(claimErrorHandler);

// Test Route
app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});

// Start Server
// Use the 'port' variable defined above
server.listen(port, () => {
  console.log(`Server started on port ${port}!`);
});
