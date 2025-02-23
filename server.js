const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
const connectDB = require("./src/config/db");
const http = require("http");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config(); // Load environment variables

// Connect to Database
connectDB();

// Middleware
app.use(cors({ origin: "http://localhost:3001", credentials: true }));
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Passport Authentication
const passport = require("./src/config/passport"); // Import the passport config
app.use(passport.initialize());
app.use(passport.session());
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

// Routes
app.use("/auth", authRoutes); // New route for authentication
app.use("/User", userRoutes);
app.use("/api", claimRoutes);
app.use("/api", contractRoutes);
app.use("/api", parkingRoutes);
app.use("/api", reportRoutes);
app.use("/api", reservationRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", passwordRoutes);

// Simple Route
app.get("/", (req, res) => {
  res.send("MongoDB is connected to Express!");
});

// Start Server
const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server started on port ${port}!`);
});
