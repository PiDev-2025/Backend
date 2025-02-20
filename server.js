const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;
const connectDB = require("./src/config/db");
var http = require('http')

connectDB();

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
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

app.use(express.json());
const claimRoutes = require("./src/routes/claimRoutes"); 
const userRoutes = require("./src/routes/userRoutes");
const contractRoutes = require("./src/routes/contractRoutes"); 
const parkingRoutes = require("./src/routes/parkingRoutes"); 
const reportRoutes = require("./src/routes/reportRoutes");
const reservationRoutes = require("./src/routes/reservationRoutes");
const subscriptionRoutes = require("./src/routes/subscriptionRoutes");
const passwordRoutes = require("./src/routes/passwordRoutes");
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

// Handle preflight requests
app.options('*', cors(corsOptions));

var server = http.createServer(app)
server.listen(port,()=>{
  console.log(`server started on port ${port}!`);
})


